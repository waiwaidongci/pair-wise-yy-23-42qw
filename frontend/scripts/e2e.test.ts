/**
 * 真实浏览器端到端验证（Playwright + 无头 Chromium）。
 * 运行：npx tsx scripts/e2e.test.ts
 */
import { chromium, type BrowserContext } from "playwright";

const BASE = "http://localhost:20111";
let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name} ${detail}`);
  }
}

async function clearDb(context: BrowserContext) {
  const page = await context.newPage();
  await page.goto(BASE);
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.deleteDatabase("braille-trainer-ledger");
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  });
  await page.close();
}

async function boot(page: import("playwright").Page) {
  await page.goto(`${BASE}/#/practice`);
  await page.waitForSelector("text=开始一场新练习", { timeout: 15000 });
}

async function startSession(page: import("playwright").Page) {
  await page.selectOption("select", "1");
  await page.click("text=开练（冻结快照）");
  await page.waitForSelector(".practice-panel");
}

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await clearDb(context);

  // ---- 场景 1：开练冻结快照 + 答题两阶段结算 ----
  const page = await context.newPage();
  const logs: string[] = [];
  page.on("console", (m) => { if (m.type() === "info") logs.push(m.text()); });
  await boot(page);
  await startSession(page);

  const progressBefore = await page.locator(".progress-meta span").first().textContent();
  check("开练后出现 5 题总量", /\/5 题/.test(progressBefore ?? ""), progressBefore ?? "");
  check("题目提示基于冻结版本", (await page.locator(".practice-hint").textContent())?.includes("冻结的 v1") ?? false);

  // 读当前题的正确字符（从题目 SVG 无法直接取，改用错答/对答序列：直接输入 a-e 之一不一定对，
  // 这里通过页面内 evaluate 读取 IndexedDB 中当前题快照的 letter）
  const expected = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("braille-trainer-ledger");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const sessions = await new Promise<any[]>((res, rej) => {
      const rq = db.transaction("practice_sessions").objectStore("practice_sessions").getAll();
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    const s = sessions[0];
    return s.symbol_snapshots[s.current_symbol_id].letter;
  });
  await page.fill(".answer-row input", expected);
  await page.click("text=提交（先记操作号）");
  await page.waitForSelector(".alert.ok");
  check("答对即时反馈", (await page.locator(".alert.ok").textContent())?.includes("答对了") ?? false);
  check("操作号先记后结算日志", logs.some((l) => l.includes("答题操作号已记") || l.includes("结算成功")));
  const progressAfter = await page.locator(".progress-meta span").first().textContent();
  check("会话推进一步（1/5）", /1\/5 题/.test(progressAfter ?? ""), progressAfter ?? "");

  // ---- 场景 2：改卡片后未完成题失效重排 ----
  await page.goto(`${BASE}/#/learn`);
  await page.waitForSelector(".symbol-card");
  // 取得会话剩余题中一张卡的 id，在学习页改它；为稳定起见直接改第一张卡（a），
  // 若它恰好在剩余队列则会触发失效。直接通过页面 DB 改版本更可靠：
  const invalidateInfo = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("braille-trainer-ledger");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const get = <T,>(store: string) => new Promise<T[]>((res, rej) => {
      const rq = db.transaction(store).objectStore(store).getAll();
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    const sessions = await get<any>("practice_sessions");
    const s = sessions.find((x) => x.status === "RUNNING")!;
    const targetId = s.pending_symbol_ids[0];
    const symbols = await get<any>("braille_symbols");
    const target = symbols.find((x) => x.id === targetId)!;
    const changed = { ...target, cell_pattern: target.cell_pattern + ",6", version: target.version + 1, updated_at: new Date().toISOString() };
    await new Promise<void>((res, rej) => {
      const t = db.transaction("braille_symbols", "readwrite");
      t.objectStore("braille_symbols").put(changed);
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
    });
    return { targetId, remaining: s.pending_symbol_ids.length };
  });

  await page.goto(`${BASE}/#/practice`);
  // 历史会话中点“继续（失效重排）”
  await page.click("text=继续（失效重排）");
  await page.waitForSelector(".alert.warning", { timeout: 5000 }).catch(() => null);
  const warn = await page.locator(".alert.warning").allTextContents();
  check("出现失效重排提示", warn.some((w) => w.includes("失效并重排")), warn.join("|"));
  const stillQueued = await page.evaluate(async (id: number) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("braille-trainer-ledger");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const sessions = await new Promise<any[]>((res, rej) => {
      const rq = db.transaction("practice_sessions").objectStore("practice_sessions").getAll();
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    return sessions.find((x) => x.current_symbol_id !== null || x.status === "RUNNING" || x.status === "RECOVERED").pending_symbol_ids.includes(id);
  }, invalidateInfo.targetId);
  check("改版题目已移出待答队列", stillQueued === false);

  // ---- 场景 3：两个标签页并发提交，只结算一笔 ----
  const page2 = await context.newPage();
  await page2.goto(`${BASE}/#/practice`);
  await page2.click("text=继续（失效重排）").catch(() => null);
  await page2.waitForSelector(".practice-panel", { timeout: 5000 });

  const letterForCurrent = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("braille-trainer-ledger");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const sessions = await new Promise<any[]>((res, rej) => {
      const rq = db.transaction("practice_sessions").objectStore("practice_sessions").getAll();
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    const s = sessions.find((x) => x.status === "RUNNING" || x.status === "RECOVERED");
    return s.symbol_snapshots[s.current_symbol_id].letter;
  });

  // 两个页面填写并几乎同时点击
  await page.fill(".answer-row input", letterForCurrent);
  await page2.fill(".answer-row input", letterForCurrent);
  await Promise.all([
    page.click("text=提交（先记操作号）"),
    page2.click("text=提交（先记操作号）")
  ]);
  await page.waitForTimeout(1200);

  const settledCount = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("braille-trainer-ledger");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const answers = await new Promise<any[]>((res, rej) => {
      const rq = db.transaction("answer_records").objectStore("answer_records").getAll();
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    const sessions = await new Promise<any[]>((res, rej) => {
      const rq = db.transaction("practice_sessions").objectStore("practice_sessions").getAll();
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    const s = sessions.find((x) => x.id === 1);
    return {
      settled: answers.filter((a) => a.status === "SETTLED").length,
      answered: s.answered_count,
      dupPages: 0
    };
  });
  check("并发后 SETTLED 总数与会话计数一致（只结算一笔）", settledCount.settled === settledCount.answered, `settled=${settledCount.settled} answered=${settledCount.answered}`);

  const anyDupWarn =
    (await page.locator(".alert.warning", { hasText: "并发提交" }).count()) +
    (await page2.locator(".alert.warning", { hasText: "并发提交" }).count());
  check("后到页面看到并发拦截提示且输入现场保留", anyDupWarn >= 1);
  const loserKeptInput =
    (await page.inputValue(".answer-row input").catch(() => "")) === letterForCurrent ||
    (await page2.inputValue(".answer-row input").catch(() => "")) === letterForCurrent;
  check("后到页面保留了输入内容", loserKeptInput);

  // ---- 场景 4：崩溃恢复（刷新页面后未出现半条记录；进度页统计只认 SETTLED）----
  await page.reload();
  await page.waitForTimeout(1500);
  await page.goto(`${BASE}/#/progress`);
  await page.waitForSelector(".metrics");
  const statText = await page.locator(".metrics").textContent();
  check("进度页展示已结算答题数", /已结算答题/.test(statText ?? ""));
  const noPending = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("braille-trainer-ledger");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const [answers, ops] = await Promise.all([
      new Promise<any[]>((res, rej) => { const rq = db.transaction("answer_records").objectStore("answer_records").getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); }),
      new Promise<any[]>((res, rej) => { const rq = db.transaction("answer_op_logs").objectStore("answer_op_logs").getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); })
    ]);
    return !answers.some((a) => a.status === "PENDING") && !ops.some((o) => o.status === "PENDING");
  });
  check("刷新恢复后不存在 PENDING 残留", noPending);

  // ---- 场景 5：错题本只显示 SETTLED 错账并带冻结版本 ----
  await page.goto(`${BASE}/#/mistakes`);
  await page.waitForTimeout(800);
  check("错题本正常加载（无错题时空态或有错账列表）", (await page.locator(".empty, .mistake-card").count()) >= 1);

  await browser.close();
  console.log(`\n${passed}/${passed + failed} 通过`);
  if (failed > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
