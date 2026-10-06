import {
  getAll,
  getById,
  openLedgerDb,
  putOne,
  STORE,
  tx,
  withCacheEvictionOnQuota
} from "../db/ledgerDb";
import { nextId } from "../db/ledgerInit";
import { createPendingAnswerRecord } from "../constructors/AnswerRecordConstructor";
import { createPracticeSessionFromSnapshot } from "../constructors/PracticeSessionConstructor";
import { ERROR_CODES } from "../constants/errorCodes";
import type { AnswerOpLog } from "../types/AnswerOpLog";
import type { AnswerRecord } from "../types/AnswerRecord";
import type { InvalidatedQuestion, InvalidationReason } from "../types/InvalidatedQuestion";
import type { PracticeSession } from "../types/PracticeSession";
import { log } from "../utils/logger";
import { buildIdempotencyKey, shuffleOrder } from "../utils/tabIdentity";
import { LedgerError, wrapServiceError } from "./LedgerError";
import { getLesson } from "./LessonService";
import { listBrailleSymbols } from "./BrailleSymbolService";
import { expectedAnswerFor, gradeAnswer } from "./grading";

export interface StartSessionInput {
  lessonId: number;
  mode: PracticeSession["mode"];
  ownerTab: string;
}

export interface SubmitAnswerInput {
  sessionId: number;
  symbolId: number;
  /** 该题在本场会话中的题目序号（0 起），构成幂等键 */
  questionIndex: number;
  userAnswer: string;
  latencyMs: number;
  sourceTab: string;
}

export interface SubmitOutcome {
  status: "SETTLED" | "DUPLICATE_REJECTED";
  answer?: AnswerRecord;
  /** 后到页面：胜出答案是什么（用于“保留现场”的对比提示） */
  winner?: AnswerRecord;
  session: PracticeSession;
  /** 本次提交顺带完成的失效重排 */
  invalidated: InvalidatedQuestion[];
}

/** 开练：冻结课程与卡片快照，建立会话账本 */
export async function startPracticeSession(input: StartSessionInput): Promise<PracticeSession> {
  try {
    const lesson = await getLesson(input.lessonId);
    if (!lesson) throw new LedgerError(ERROR_CODES.SESSION_NOT_FOUND, { lessonId: input.lessonId });
    const allSymbols = await listBrailleSymbols();
    const symbols = lesson.symbol_ids
      .map((id) => allSymbols.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
    if (symbols.length === 0) throw new LedgerError(ERROR_CODES.VALIDATION_FAILED, { lessonId: input.lessonId });

    const db = await openLedgerDb();
    const sessionId = await nextId(STORE.sessions);
    const session = createPracticeSessionFromSnapshot({
      id: sessionId,
      lesson,
      symbols,
      mode: input.mode,
      pendingSymbolIds: shuffleOrder(lesson.symbol_ids),
      ownerTab: input.ownerTab,
      now: new Date().toISOString()
    });
    await withCacheEvictionOnQuota(db, [STORE.sessions, STORE.opLog], async (d) => {
      await new Promise<void>((resolve, reject) => {
        const t = d.transaction([STORE.sessions, STORE.opLog], "readwrite");
        t.objectStore(STORE.sessions).put(session);
        const op: Omit<AnswerOpLog, "seq"> = {
          type: "SESSION_START",
          status: "COMMITTED",
          session_id: sessionId,
          idempotency_key: `session:${sessionId}:start`,
          source_tab: input.ownerTab,
          payload: null,
          created_at: session.started_at,
          settled_at: session.started_at
        };
        t.objectStore(STORE.opLog).add(op);
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      });
    });
    log("PracticeSession", 0, { sessionId, lessonId: lesson.id, mode: input.mode, tab: input.ownerTab });
    return session;
  } catch (error) {
    throw wrapServiceError(error);
  }
}

export async function listPracticeSessions(): Promise<PracticeSession[]> {
  const db = await openLedgerDb();
  const rows = await getAll<PracticeSession>(db, STORE.sessions);
  return rows.sort((a, b) => b.id - a.id);
}

export async function getPracticeSession(id: number): Promise<PracticeSession | undefined> {
  const db = await openLedgerDb();
  return getById<PracticeSession>(db, STORE.sessions, id);
}

export async function listAnswerRecords(filter?: { sessionId?: number; settledOnly?: boolean }): Promise<AnswerRecord[]> {
  const db = await openLedgerDb();
  const rows = await getAll<AnswerRecord>(db, STORE.answers);
  return rows
    .filter((r) => (filter?.sessionId === undefined ? true : r.session_id === filter.sessionId))
    .filter((r) => (filter?.settledOnly ? r.status === "SETTLED" : true))
    .sort((a, b) => a.id - b.id);
}

export async function listInvalidatedQuestions(sessionId?: number): Promise<InvalidatedQuestion[]> {
  const db = await openLedgerDb();
  const rows = await getAll<InvalidatedQuestion>(db, STORE.invalidations);
  return rows.filter((r) => (sessionId === undefined ? true : r.session_id === sessionId)).sort((a, b) => a.id - b.id);
}

export async function listOpLogs(sessionId?: number): Promise<AnswerOpLog[]> {
  const db = await openLedgerDb();
  const rows = await getAll<AnswerOpLog>(db, STORE.opLog);
  return rows.filter((op) => (sessionId === undefined ? true : op.session_id === sessionId)).sort((a, b) => a.seq - b.seq);
}

/**
 * 提交答案（两阶段，单事务原子完成）：
 * 1. 先 append SUBMIT 操作（只带操作号与意图）
 * 2. 写 PENDING 答题记录；幂等键唯一索引保证两个标签页并发只有一笔落地
 * 3. 立即把操作置 COMMITTED、记录置 SETTLED，推进会话
 * 4. 同事务做课程/卡片失效重排，队列空了就结算会话
 * 崩溃发生在 1 之后、3 之前时，重启由 recoverLedger 补齐或撤掉。
 */
export async function submitAnswer(input: SubmitAnswerInput): Promise<SubmitOutcome> {
  const db = await openLedgerDb();
  try {
    return await withCacheEvictionOnQuota(db, [STORE.sessions, STORE.answers, STORE.opLog, STORE.invalidations], () =>
      settleAnswer(db, input)
    );
  } catch (error) {
    throw wrapServiceError(error);
  }
}

async function settleAnswer(db: IDBDatabase, input: SubmitAnswerInput): Promise<SubmitOutcome> {
  const idempotencyKey = buildIdempotencyKey(input.sessionId, input.questionIndex);

  // 并发快路径：另一标签页已结算同一题 -> 后到页面直接保留现场，不再写账
  const winner = await findByIdempotencyKey(db, idempotencyKey);
  if (winner && winner.status === "SETTLED") {
    log("AnswerRecord", 3, { key: idempotencyKey, winnerTab: winner.source_tab, loserTab: input.sourceTab });
    const sessionNow = await getPracticeSession(input.sessionId);
    if (!sessionNow) throw new LedgerError(ERROR_CODES.SESSION_NOT_FOUND, { sessionId: input.sessionId });
    return { status: "DUPLICATE_REJECTED", winner, session: sessionNow, invalidated: [] };
  }

  return new Promise<SubmitOutcome>((resolve, reject) => {
    const storeNames = [STORE.sessions, STORE.answers, STORE.opLog, STORE.invalidations, STORE.lessons, STORE.symbols];
    const t = db.transaction(storeNames, "readwrite");
    const osSessions = t.objectStore(STORE.sessions);
    const osAnswers = t.objectStore(STORE.answers);
    const osOps = t.objectStore(STORE.opLog);
    const osInvalidations = t.objectStore(STORE.invalidations);

    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error("settle aborted"));

    const getSessionReq = osSessions.get(input.sessionId);
    getSessionReq.onsuccess = async () => {
      try {
        const session = getSessionReq.result as PracticeSession | undefined;
        if (!session) throw new LedgerError(ERROR_CODES.SESSION_NOT_FOUND, { sessionId: input.sessionId });

        // 事务内再裁决一次幂等键：两个标签页的事务被 IndexedDB 串行化时，
        // 先到的一笔可能已结算并推进了会话，后到者在这里认负、保留现场
        const existingByKey = await requestPromise<AnswerRecord | undefined>(
          osAnswers.index("idempotency_key").get(idempotencyKey)
        );
        if (existingByKey && existingByKey.status === "SETTLED") {
          log("AnswerRecord", 3, {
            key: idempotencyKey,
            winnerTab: existingByKey.source_tab,
            loserTab: input.sourceTab
          });
          t.oncomplete = () =>
            resolve({ status: "DUPLICATE_REJECTED", winner: existingByKey, session, invalidated: [] });
          return;
        }

        if (session.status === "FINISHED" || session.status === "ABANDONED") {
          throw new LedgerError(ERROR_CODES.SESSION_NOT_RUNNING, { sessionId: input.sessionId, status: session.status });
        }
        if (session.current_symbol_id !== input.symbolId) {
          throw new LedgerError(ERROR_CODES.QUESTION_NOT_PENDING, {
            expected: session.current_symbol_id,
            actual: input.symbolId
          });
        }
        const snapshot = session.symbol_snapshots[input.symbolId];
        if (!snapshot) throw new LedgerError(ERROR_CODES.VALIDATION_FAILED, { symbolId: input.symbolId });

        const nowIso = new Date().toISOString();
        const expected = expectedAnswerFor(snapshot, session.mode);

        // —— 阶段 1：操作号先落账（PENDING 意图） ——
        const opAddReq = osOps.add({
          type: "ANSWER_SUBMIT",
          status: "PENDING",
          session_id: input.sessionId,
          idempotency_key: idempotencyKey,
          source_tab: input.sourceTab,
          payload: {
            symbol_id: input.symbolId,
            user_answer: input.userAnswer,
            latency_ms: input.latencyMs,
            expected_answer: expected
          },
          created_at: nowIso,
          settled_at: null
        } satisfies Omit<AnswerOpLog, "seq">);
        const opSeq = (await requestPromise(opAddReq as IDBRequest<number>)) as number;

        // —— 阶段 2：写 PENDING 答题记录（唯一索引兜底并发） ——
        const { correct, reason } = gradeAnswer(input.userAnswer, snapshot, session.mode);
        const answerId = await nextIdInStore(osAnswers);
        const pending = createPendingAnswerRecord({
          id: answerId,
          sessionId: input.sessionId,
          symbolId: input.symbolId,
          userAnswer: input.userAnswer,
          expectedAnswer: expected,
          correct,
          latencyMs: input.latencyMs,
          mistakeReason: reason,
          idempotencyKey,
          opSeq,
          snapshot,
          sourceTab: input.sourceTab,
          now: nowIso
        });

        const duplicate = await addUnlessDuplicate(osAnswers, pending);
        if (duplicate) {
          // 同事务内撞唯一索引：另一个标签页抢跑。撤掉自己的操作号，保留页面现场
          const winnerRow = await requestPromise<AnswerRecord | undefined>(
            osAnswers.index("idempotency_key").get(idempotencyKey)
          );
          await requestPromise(
            osOps.put({ ...(await requireOp(osOps, opSeq)), type: "ANSWER_ABORT", status: "ABORTED", settled_at: new Date().toISOString() })
          );
          log("AnswerRecord", 3, {
            key: idempotencyKey,
            winnerTab: winnerRow?.source_tab ?? "?",
            loserTab: input.sourceTab
          });
          t.oncomplete = () =>
            resolve({ status: "DUPLICATE_REJECTED", winner: winnerRow, session, invalidated: [] });
          return;
        }

        // —— 阶段 3：结算（COMMITTED / SETTLED） ——
        const settledAt = new Date().toISOString();
        const settled: AnswerRecord = { ...pending, status: "SETTLED", settled_at: settledAt };
        await requestPromise(osAnswers.put(settled));
        await requestPromise(
          osOps.put({
            ...(await requireOp(osOps, opSeq)),
            type: "ANSWER_COMMIT",
            status: "COMMITTED",
            settled_at: settledAt
          })
        );
        log("AnswerRecord", 1, { seq: opSeq, sessionId: input.sessionId, correct: String(correct) });

        // —— 阶段 4：当前题出队，未完成题按最新课程/卡片失效重排 ——
        const afterAnswer: PracticeSession = {
          ...session,
          answered_count: session.answered_count + 1,
          mistake_count: session.mistake_count + (settled.correct ? 0 : 1),
          score: session.score + (settled.correct ? 1 : 0),
          pending_symbol_ids: session.pending_symbol_ids.filter((id) => id !== input.symbolId),
          last_active_at: settledAt
        };
        const reconcileResult = await reconcileInTx(afterAnswer, t, osInvalidations, osOps, settledAt);
        let nextSession = reconcileResult.session;
        if (
          nextSession.pending_symbol_ids.length === 0 &&
          (nextSession.status === "RUNNING" || nextSession.status === "RECOVERED")
        ) {
          nextSession = await finishInTx(osSessions, osOps, nextSession, input.sourceTab);
        } else {
          nextSession = { ...nextSession, current_symbol_id: nextSession.pending_symbol_ids[0] ?? null };
          await requestPromise(osSessions.put(nextSession));
        }
        t.oncomplete = () =>
          resolve({ status: "SETTLED", answer: settled, session: nextSession, invalidated: reconcileResult.invalidated });
      } catch (error) {
        reject(error);
      }
    };
  });
}

/**
 * 基于最新课程/卡片对会话未完成题做失效重排（可在任意读写事务内复用）：
 * - 课程里被移除的题        -> SYMBOL_REMOVED（课程整体不在 -> LESSON_CHANGED）
 * - 冻结后卡片版本变化的题  -> SYMBOL_CHANGED
 * 剩余题重新洗牌排队；一道未答且全失效时会话置 ABANDONED。
 */
async function reconcileInTx(
  session: PracticeSession,
  t: IDBTransaction,
  osInvalidations: IDBObjectStore,
  osOps?: IDBObjectStore,
  nowIso: string = new Date().toISOString()
): Promise<{ session: PracticeSession; invalidated: InvalidatedQuestion[] }> {
  if (session.status !== "RUNNING" && session.status !== "RECOVERED") {
    return { session, invalidated: [] };
  }
  const latestLesson = await requestPromise<{ symbol_ids: number[] } | undefined>(
    t.objectStore(STORE.lessons).get(session.lesson_id)
  );
  const lessonExists = Boolean(latestLesson);
  const validIds = new Set<number>((latestLesson?.symbol_ids ?? []).map(Number));
  const symbolsStore = t.objectStore(STORE.symbols);

  const invalidated: InvalidatedQuestion[] = [];
  const survivors: number[] = [];
  let nextInvId = await countStore(osInvalidations);

  for (const symbolId of session.pending_symbol_ids) {
    let reason: InvalidationReason | null = null;
    let currentVersion = session.symbol_snapshots[symbolId]?.version ?? 0;
    if (!lessonExists) {
      reason = "LESSON_CHANGED";
    } else if (!validIds.has(symbolId)) {
      reason = "SYMBOL_REMOVED";
    } else {
      const latest = await requestPromise<{ version: number } | undefined>(symbolsStore.get(symbolId));
      if (latest) {
        currentVersion = latest.version;
        if (latest.version !== (session.symbol_snapshots[symbolId]?.version ?? -1)) reason = "SYMBOL_CHANGED";
      }
    }
    if (reason) {
      const entry: InvalidatedQuestion = {
        id: (nextInvId += 1),
        session_id: session.id,
        symbol_id: symbolId,
        reason,
        frozen_version: session.symbol_snapshots[symbolId]?.version ?? 0,
        current_version: currentVersion,
        detected_at: nowIso
      };
      invalidated.push(entry);
      await requestPromise(osInvalidations.put(entry));
    } else {
      survivors.push(symbolId);
    }
  }

  if (invalidated.length === 0) return { session, invalidated: [] };

  const reordered = shuffleOrder(survivors);
  const nextStatus: PracticeSession["status"] =
    reordered.length === 0 && session.answered_count === 0
      ? "ABANDONED"
      : reordered.length === 0
        ? "ABANDONED"
        : session.status;
  const nextSession: PracticeSession = {
    ...session,
    pending_symbol_ids: reordered,
    current_symbol_id: reordered[0] ?? null,
    status: nextStatus,
    last_active_at: nowIso
  };

  if (osOps) {
    await requestPromise(
      osOps.add({
        type: "SESSION_INVALIDATE",
        status: "COMMITTED",
        session_id: session.id,
        idempotency_key: `session:${session.id}:invalidate:${nowIso}`,
        source_tab: session.owner_tab,
        payload: { invalidated: invalidated.map((i) => i.symbol_id) } as never,
        created_at: nowIso,
        settled_at: nowIso
      } satisfies Omit<AnswerOpLog, "seq">)
    ).catch(() => undefined);
  }
  log("PracticeSession", 3, {
    sessionId: session.id,
    invalidated: invalidated.length,
    remaining: reordered.length
  });
  return { session: nextSession, invalidated };
}

/** 进入页面/切回标签页时可主动调用的失效重排入口 */
export async function reconcileSession(
  sessionId: number
): Promise<{ session: PracticeSession; invalidated: InvalidatedQuestion[] }> {
  const db = await openLedgerDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(
      [STORE.sessions, STORE.invalidations, STORE.lessons, STORE.symbols, STORE.opLog],
      "readwrite"
    );
    const osSessions = t.objectStore(STORE.sessions);
    const req = osSessions.get(sessionId);
    req.onerror = () => reject(req.error);
    req.onsuccess = async () => {
      try {
        const session = req.result as PracticeSession | undefined;
        if (!session) throw new LedgerError(ERROR_CODES.SESSION_NOT_FOUND, { sessionId });
        const result = await reconcileInTx(session, t, t.objectStore(STORE.invalidations), t.objectStore(STORE.opLog));
        await requestPromise(osSessions.put(result.session));
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      } catch (error) {
        reject(error);
      }
    };
  });
}

async function finishInTx(
  osSessions: IDBObjectStore,
  osOps: IDBObjectStore,
  session: PracticeSession,
  sourceTab: string
): Promise<PracticeSession> {
  const nowIso = new Date().toISOString();
  const finished: PracticeSession = {
    ...session,
    status: "FINISHED",
    finished_at: nowIso,
    current_symbol_id: null,
    last_active_at: nowIso
  };
  await requestPromise(osSessions.put(finished));
  await requestPromise(
    osOps.add({
      type: "SESSION_FINISH",
      status: "COMMITTED",
      session_id: session.id,
      idempotency_key: `session:${session.id}:finish`,
      source_tab: sourceTab,
      payload: { score: finished.score, mistakes: finished.mistake_count } as never,
      created_at: nowIso,
      settled_at: nowIso
    } satisfies Omit<AnswerOpLog, "seq">)
  );
  log("PracticeSession", 4, { sessionId: session.id, score: finished.score, mistakes: finished.mistake_count });
  return finished;
}

/**
 * 崩溃恢复（应用启动时执行一次）：
 * 扫描所有 PENDING 操作：
 *  - 有 PENDING 答题记录现场 -> 补齐为 SETTLED/COMMITTED，并推进会话
 *  - 无现场（操作写了一半）     -> 撤掉（ABORTED），残留答题记录置 ROLLED_BACK
 * 然后对半截会话标记 RECOVERED 并做失效重排；队列已空的直接 FINISHED。
 */
export async function recoverLedger(): Promise<{ committed: number; aborted: number; recoveredSessions: number[] }> {
  const db = await openLedgerDb();
  const pendingOps = (await getAll<AnswerOpLog>(db, STORE.opLog)).filter((op) => op.status === "PENDING");
  let committed = 0;
  let aborted = 0;

  for (const op of pendingOps) {
    if (op.type === "ANSWER_SUBMIT") {
      const result = await recoverAnswerOp(op);
      committed += result.committed ? 1 : 0;
      aborted += result.aborted ? 1 : 0;
    } else {
      await withCacheEvictionOnQuota(db, [STORE.opLog], async (d) => {
        await requestPromise(
          d.transaction(STORE.opLog, "readwrite").objectStore(STORE.opLog).put({
            ...op,
            status: "ABORTED",
            settled_at: new Date().toISOString()
          })
        );
      });
      aborted += 1;
    }
  }

  const sessions = await getAll<PracticeSession>(db, STORE.sessions);
  const crashedSessions = sessions.filter((s) => s.status === "RUNNING" && s.finished_at === null);
  const recoveredSessions: number[] = [];
  for (const session of crashedSessions) {
    if (session.pending_symbol_ids.length === 0) {
      const nowIso = new Date().toISOString();
      await putOne(db, STORE.sessions, {
        ...session,
        status: "FINISHED",
        finished_at: nowIso,
        current_symbol_id: null,
        last_active_at: nowIso
      } satisfies PracticeSession);
    } else {
      await putOne(db, STORE.sessions, {
        ...session,
        status: "RECOVERED",
        last_active_at: new Date().toISOString()
      } satisfies PracticeSession);
      recoveredSessions.push(session.id);
      await reconcileSession(session.id);
    }
  }

  if (pendingOps.length > 0 || crashedSessions.length > 0) {
    log("PracticeSession", 2, { sessionId: 0, committed, aborted });
    log("Ledger", 3, { pendingOps: pendingOps.length, crashedSessions: crashedSessions.length });
  }
  return { committed, aborted, recoveredSessions };
}

async function recoverAnswerOp(op: AnswerOpLog): Promise<{ committed: boolean; aborted: boolean }> {
  const db = await openLedgerDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction([STORE.opLog, STORE.answers, STORE.sessions, STORE.lessons, STORE.symbols, STORE.invalidations], "readwrite");
    const osOps = t.objectStore(STORE.opLog);
    const osAnswers = t.objectStore(STORE.answers);
    const osSessions = t.objectStore(STORE.sessions);

    const answerReq = osAnswers.index("op_seq").getAll(op.seq);
    answerReq.onerror = () => reject(answerReq.error);
    answerReq.onsuccess = async () => {
      try {
        const rows = answerReq.result as AnswerRecord[];
        const pending = rows.find((r) => r.status === "PENDING");
        const settledAt = new Date().toISOString();
        if (pending && op.payload) {
          // 有提交现场：补齐结算
          const settled: AnswerRecord = { ...pending, status: "SETTLED", settled_at: settledAt };
          await requestPromise(osAnswers.put(settled));
          await requestPromise(
            osOps.put({ ...op, type: "ANSWER_COMMIT", status: "COMMITTED", settled_at: settledAt })
          );
          const session = await requestPromise<PracticeSession | undefined>(osSessions.get(op.session_id));
          if (session && (session.status === "RUNNING" || session.status === "RECOVERED")) {
            const afterAnswer: PracticeSession = {
              ...session,
              answered_count: session.answered_count + 1,
              mistake_count: session.mistake_count + (settled.correct ? 0 : 1),
              score: session.score + (settled.correct ? 1 : 0),
              pending_symbol_ids: session.pending_symbol_ids.filter((id) => id !== settled.symbol_id),
              last_active_at: settledAt
            };
            const reconcileResult = await reconcileInTx(afterAnswer, t, t.objectStore(STORE.invalidations), osOps, settledAt);
            let nextSession = reconcileResult.session;
            if (
              nextSession.pending_symbol_ids.length === 0 &&
              (nextSession.status === "RUNNING" || nextSession.status === "RECOVERED")
            ) {
              nextSession = await finishInTx(osSessions, osOps, nextSession, op.source_tab);
            } else {
              nextSession = { ...nextSession, current_symbol_id: nextSession.pending_symbol_ids[0] ?? null };
              await requestPromise(osSessions.put(nextSession));
            }
          }
          log("AnswerRecord", 1, { seq: op.seq, sessionId: op.session_id, correct: String(settled.correct) });
          t.oncomplete = () => resolve({ committed: true, aborted: false });
        } else {
          // 无现场：撤掉操作号，残留答题记录置 ROLLED_BACK（留痕，不进错题本）
          await requestPromise(osOps.put({ ...op, status: "ABORTED", settled_at: settledAt }));
          for (const row of rows) {
            await requestPromise(osAnswers.put({ ...row, status: "ROLLED_BACK", settled_at: settledAt }));
          }
          log("AnswerRecord", 2, { seq: op.seq, sessionId: op.session_id, reason: "RECOVERY_ABORT" });
          t.oncomplete = () => resolve({ committed: false, aborted: true });
        }
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      } catch (error) {
        reject(error);
      }
    };
  });
}

// ---- IndexedDB 事务小工具 ----

function requestPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * add 一条记录；撞唯一索引（两个标签页并发同题）时吞掉 ConstraintError 并返回 true。
 * preventDefault 阻止错误冒泡导致整个事务回滚。
 */
function addUnlessDuplicate(store: IDBObjectStore, value: AnswerRecord): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const req = store.add(value);
    req.onsuccess = () => resolve(false);
    req.onerror = (event) => {
      if (req.error?.name === "ConstraintError") {
        event.preventDefault();
        event.stopPropagation();
        resolve(true);
      } else {
        reject(req.error);
      }
    };
  });
}

async function requireOp(osOps: IDBObjectStore, seq: number): Promise<AnswerOpLog> {
  const op = await requestPromise<AnswerOpLog | undefined>(osOps.get(seq));
  if (!op) throw new LedgerError(ERROR_CODES.LEDGER_NOT_READY, { seq });
  return op;
}

async function findByIdempotencyKey(db: IDBDatabase, key: string): Promise<AnswerRecord | undefined> {
  return tx<AnswerRecord | undefined>(db, STORE.answers, "readonly", (t) =>
    t.objectStore(STORE.answers).index("idempotency_key").get(key) as IDBRequest<AnswerRecord | undefined>
  );
}

async function nextIdInStore(os: IDBObjectStore): Promise<number> {
  const all = await requestPromise<{ id?: number }[]>(os.getAll() as IDBRequest<{ id?: number }[]>);
  return all.reduce((max, row) => Math.max(max, typeof row.id === "number" ? row.id : 0), 0) + 1;
}

async function countStore(os: IDBObjectStore): Promise<number> {
  return requestPromise<number>(os.count());
}
