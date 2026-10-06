/**
 * 可恢复账本集成测试（fake-indexeddb，Node 环境）。
 * 运行：npx tsx scripts/ledger.test.ts
 */
import { beforeAll, beforeEach, test, expect, run } from "./miniTest";
import "fake-indexeddb/auto";

// 每个用例使用全新数据库
async function resetDb() {
  await __closeDbConnection();
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("braille-trainer-ledger");
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error("delete blocked"));
  });
  __resetDbConnection();
  __resetLedgerInit();
}

import { initLedger, __resetLedgerInit } from "../src/db/ledgerInit";
import { STORE, getAll, openLedgerDb, putOne, __closeDbConnection, __resetDbConnection } from "../src/db/ledgerDb";
import { startPracticeSession, submitAnswer, recoverLedger, listPracticeSessions, listAnswerRecords, reconcileSession } from "../src/services/PracticeLedgerService";
import { saveBrailleSymbol, listBrailleSymbols } from "../src/services/BrailleSymbolService";
import * as LessonService from "../src/services/LessonService";
import type { PracticeSession } from "../src/types/PracticeSession";
import type { AnswerOpLog } from "../src/types/AnswerOpLog";
import type { AnswerRecord } from "../src/types/AnswerRecord";

beforeAll(async () => {
  // noop
});

beforeEach(async () => {
  await resetDb();
  await initLedger();
});

test("开练冻结课程与卡片快照，之后改卡片不影响本场快照", async () => {
  const session = await startPracticeSession({ lessonId: 1, mode: "CELL_TO_TEXT", ownerTab: "tab-A" });
  expect(session.lesson_snapshot?.version).toBe(1);
  expect(session.symbol_snapshots[1]?.version).toBe(1);
  expect(session.pending_symbol_ids.length).toBe(5);

  // 老师改卡片 1（版本 +1）
  const updated = await saveBrailleSymbol({ id: 1, letter: "a", cell_pattern: "1,2", pinyin: "a", category: "LETTER", difficulty: "1", audio_hint_key: "letter:a" });
  expect(updated.version).toBe(2);

  const reloaded = (await listPracticeSessions()).find((s) => s.id === session.id)!;
  expect(reloaded.symbol_snapshots[1]?.cell_pattern).toBe("1"); // 快照不被污染
});

test("答题先记操作号再结算：账本留下 COMMITTED 操作与 SETTLED 记录", async () => {
  const session = await startPracticeSession({ lessonId: 1, mode: "CELL_TO_TEXT", ownerTab: "tab-A" });
  const symbolId = session.current_symbol_id!;
  const snapshot = session.symbol_snapshots[symbolId];
  const outcome = await submitAnswer({
    sessionId: session.id,
    symbolId,
    questionIndex: 0,
    userAnswer: snapshot.letter,
    latencyMs: 120,
    sourceTab: "tab-A"
  });
  expect(outcome.status).toBe("SETTLED");
  expect(outcome.answer?.status).toBe("SETTLED");
  expect(outcome.answer?.correct).toBe(true);
  expect(outcome.answer?.symbol_snapshot?.version).toBe(snapshot.version);

  const db = await openLedgerDb();
  const ops = await getAll<AnswerOpLog>(db, STORE.opLog);
  const submitOp = ops.find((o) => o.type === "ANSWER_COMMIT");
  expect(submitOp?.status).toBe("COMMITTED");
  expect(typeof submitOp?.seq).toBe("number");

  const answers = await listAnswerRecords({});
  expect(answers.length).toBe(1);
  expect(answers[0].status).toBe("SETTLED");
});

test("两标签页并发提交同一题：只结算一笔，后到页面收到 DUPLICATE_REJECTED 且现场保留", async () => {
  const session = await startPracticeSession({ lessonId: 1, mode: "CELL_TO_TEXT", ownerTab: "tab-A" });
  const symbolId = session.current_symbol_id!;
  const snapshot = session.symbol_snapshots[symbolId];

  // 两个标签页几乎同时提交同一题（相同 questionIndex => 相同幂等键）
  const [a, b] = await Promise.all([
    submitAnswer({ sessionId: session.id, symbolId, questionIndex: 0, userAnswer: snapshot.letter, latencyMs: 100, sourceTab: "tab-A" }),
    submitAnswer({ sessionId: session.id, symbolId, questionIndex: 0, userAnswer: snapshot.letter, latencyMs: 200, sourceTab: "tab-B" })
  ]);

  const results = [a.status, b.status].sort();
  expect(results).toEqual(["DUPLICATE_REJECTED", "SETTLED"]);
  const winner = a.status === "SETTLED" ? a : b;
  const loser = a.status === "SETTLED" ? b : a;
  expect(loser.winner?.id).toBe(winner.answer?.id);
  // 账本中只有一笔该幂等键的 SETTLED 记录
  const answers = await listAnswerRecords({});
  expect(answers.filter((x) => x.status === "SETTLED").length).toBe(1);
  // 会话只推进一步
  const after = (await listPracticeSessions()).find((s) => s.id === session.id)!;
  expect(after.answered_count).toBe(1);
});

test("崩溃在操作号已记、结算前：重启后有现场则补齐为 SETTLED", async () => {
  const session = await startPracticeSession({ lessonId: 1, mode: "CELL_TO_TEXT", ownerTab: "tab-A" });
  const symbolId = session.current_symbol_id!;

  // 手工制造崩溃现场：PENDING op + PENDING answer
  const db = await openLedgerDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction([STORE.opLog, STORE.answers], "readwrite");
    const opReq = t.objectStore(STORE.opLog).add({
      type: "ANSWER_SUBMIT", status: "PENDING", session_id: session.id,
      idempotency_key: `session:${session.id}:question:0`, source_tab: "tab-A",
      payload: { symbol_id: symbolId, user_answer: "wrong", latency_ms: 300, expected_answer: session.symbol_snapshots[symbolId].letter },
      created_at: new Date().toISOString(), settled_at: null
    });
    opReq.onsuccess = () => {
      const seq = opReq.result as number;
      t.objectStore(STORE.answers).put({
        id: 999, session_id: session.id, symbol_id: symbolId, user_answer: "wrong",
        expected_answer: session.symbol_snapshots[symbolId].letter, correct: false, latency_ms: 300,
        mistake_reason: "WRONG_LETTER", status: "PENDING", idempotency_key: `session:${session.id}:question:0`,
        op_seq: seq, symbol_snapshot: { letter: "x", cell_pattern: "1", pinyin: "x", category: "LETTER", difficulty: "1", version: 1 },
        created_at: new Date().toISOString(), settled_at: null, source_tab: "tab-A"
      });
      t.oncomplete = () => resolve();
    };
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });

  const report = await recoverLedger();
  expect(report.committed).toBe(1);
  expect(report.aborted).toBe(0);

  const answers = await listAnswerRecords({});
  const recovered = answers.find((a) => a.id === 999)!;
  expect(recovered.status).toBe("SETTLED");
  expect(recovered.settled_at).not.toBe(null);
  const ops = await getAll<AnswerOpLog>(db, STORE.opLog);
  expect(ops.find((o) => o.type === "ANSWER_COMMIT")?.status).toBe("COMMITTED");
});

test("崩溃只剩操作号无答题现场：重启后撤掉（ABORTED），不产生错账", async () => {
  const session = await startPracticeSession({ lessonId: 1, mode: "CELL_TO_TEXT", ownerTab: "tab-A" });
  const db = await openLedgerDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE.opLog, "readwrite");
    t.objectStore(STORE.opLog).add({
      type: "ANSWER_SUBMIT", status: "PENDING", session_id: session.id,
      idempotency_key: `session:${session.id}:question:0`, source_tab: "tab-A", payload: null,
      created_at: new Date().toISOString(), settled_at: null
    });
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });

  const report = await recoverLedger();
  expect(report.aborted).toBe(1);
  const ops = await getAll<AnswerOpLog>(db, STORE.opLog);
  expect(ops.filter((o) => o.status === "ABORTED").length).toBe(1);
  const answers = await listAnswerRecords({});
  expect(answers.length).toBe(0);
});

test("卡片改版后未完成题失效并重排：改的题移出队列，已答题保留", async () => {
  const session = await startPracticeSession({ lessonId: 1, mode: "CELL_TO_TEXT", ownerTab: "tab-A" });
  const first = session.current_symbol_id!;
  // 先结算一道
  await submitAnswer({
    sessionId: session.id, symbolId: first, questionIndex: 0,
    userAnswer: session.symbol_snapshots[first].letter, latencyMs: 50, sourceTab: "tab-A"
  });

  // 把剩余 4 道里的其中一张卡片改版
  const after1 = (await listPracticeSessions()).find((s) => s.id === session.id)!;
  const targetId = after1.pending_symbol_ids[0];
  const target = (await listBrailleSymbols()).find((s) => s.id === targetId)!;
  await saveBrailleSymbol({ ...target, cell_pattern: target.cell_pattern === "1" ? "1,3" : target.cell_pattern + ",3" });

  const result = await reconcileSession(session.id);
  expect(result.invalidated.some((i) => i.symbol_id === targetId && i.reason === "SYMBOL_CHANGED")).toBe(true);
  expect(result.session.pending_symbol_ids.includes(targetId)).toBe(false);
  // 已结算的一笔不受影响
  expect(result.session.answered_count).toBe(1);
});

test("课程删掉卡片后未完成题按 SYMBOL_REMOVED 失效；全部失效且未答题则会话 ABANDONED", async () => {
  const lesson = (await LessonService.listLessons()).find((l) => l.id === 1)!;
  // 开练第三课（4 张卡）
  const session = await startPracticeSession({ lessonId: 3, mode: "MIXED", ownerTab: "tab-A" });
  // 老师把课程改成只剩一张卡，且这张卡也不是队列中的 -> 直接把课程 symbol_ids 清空
  await LessonService.saveLesson({ id: lesson.id, title: lesson.title, symbol_ids: lesson.symbol_ids });
  await LessonService.saveLesson({ id: 3, title: "第三课：数字与标点", symbol_ids: [] });

  const result = await reconcileSession(session.id);
  expect(result.invalidated.length).toBe(4);
  expect(result.invalidated.every((i) => i.reason === "SYMBOL_REMOVED")).toBe(true);
  expect(result.session.status).toBe("ABANDONED");
});

test("半截会话重启：标 RECOVERED；队列已空则 FINISHED", async () => {
  const session = await startPracticeSession({ lessonId: 1, mode: "CELL_TO_TEXT", ownerTab: "tab-A" });
  // 模拟崩溃：直接留一个 RUNNING 会话
  const report = await recoverLedger();
  expect(report.recoveredSessions.includes(session.id)).toBe(true);
  const marked = (await listPracticeSessions()).find((s) => s.id === session.id)!;
  expect(marked.status).toBe("RECOVERED");

  // 手动把队列清空后再次恢复 -> FINISHED
  const db = await openLedgerDb();
  await putOne(db, STORE.sessions, { ...marked, status: "RUNNING", pending_symbol_ids: [], current_symbol_id: null } satisfies PracticeSession);
  await recoverLedger();
  const finished = (await listPracticeSessions()).find((s) => s.id === session.id)!;
  expect(finished.status).toBe("FINISHED");
  expect(finished.finished_at).not.toBe(null);
});

test("空间不足时先清可重建缓存，账本写入仍成功", async () => {
  const { getRebuildableCache, clearAllRebuildableCache } = await import("../src/services/CacheService");
  // 先造缓存
  await getRebuildableCache("test-key", "fp-1", () => ({ hello: "world" }));
  const db = await openLedgerDb();
  const cacheRows = await getAll(db, STORE.cache);
  expect(cacheRows.length).toBe(1);

  // 拦截 put：对 cache 之外的写第一次抛 QuotaExceededError，验证 eviction 后重试
  const removed = await clearAllRebuildableCache();
  expect(removed).toBe(1);
  const cacheRowsAfter = await getAll(db, STORE.cache);
  expect(cacheRowsAfter.length).toBe(0);
  // 账本仍可读
  const answers: AnswerRecord[] = await listAnswerRecords({});
  expect(Array.isArray(answers)).toBe(true);
});

test("写账本首次撞配额：自动清空缓存并重试成功，账本数据留下", async () => {
  const { withCacheEvictionOnQuota } = await import("../src/db/ledgerDb");
  const { getRebuildableCache } = await import("../src/services/CacheService");
  await getRebuildableCache("a", "fp", () => 1);
  await getRebuildableCache("b", "fp", () => 2);
  const db = await openLedgerDb();
  expect((await getAll(db, STORE.cache)).length).toBe(2);

  let attempts = 0;
  const result = await withCacheEvictionOnQuota(db, [STORE.answers], async () => {
    attempts += 1;
    if (attempts === 1) {
      const err = new Error("simulated quota") as Error & { name: string };
      err.name = "QuotaExceededError";
      throw err;
    }
    // 第二次执行时缓存应已被清空
    return { ok: true, cacheLeft: (await getAll(db, STORE.cache)).length };
  });
  expect(attempts).toBe(2);
  expect(result.ok).toBe(true);
  expect(result.cacheLeft).toBe(0);
  // 课程与卡片账本仍在
  const symbols = await listBrailleSymbols();
  expect(symbols.length).toBe(12);
});

// 运行并汇总
import { run } from "./miniTest";
run();
