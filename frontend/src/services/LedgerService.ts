import { STORES, getByIndex, put, getByKey, add } from "../utils/ledgerDb";
import type { LedgerEntry } from "../types/LedgerEntry";
import type { AnswerRecord } from "../types/AnswerRecord";
import type { PracticeSession } from "../types/PracticeSession";
import { createDefaultAnswerRecord } from "../constructors/AnswerRecordConstructor";
import { logWrite, logError } from "../utils/logger";
import { ERROR_CODES } from "../constants/errorCodes";

/**
 * 账本服务：结算（补齐）或撤账未结算的操作记录。
 */

/**
 * 结算一笔待结算账本操作：写入答题记录并更新会话分数。
 * 必须在会话锁保护下调用。
 */
export async function settleEntry(
  entry: LedgerEntry,
  leaseId: string
): Promise<AnswerRecord> {
  if (entry.status === "settled") {
    const err = new Error(ERROR_CODES.LEDGER_ENTRY_ALREADY_SETTLED);
    logError("LedgerEntry", 1, err, { op_id: entry.op_id });
    throw err;
  }
  if (entry.status === "revoked") {
    const err = new Error(ERROR_CODES.LEDGER_ENTRY_REVOKED);
    logError("LedgerEntry", 1, err, { op_id: entry.op_id });
    throw err;
  }

  const isCorrect = entry.user_answer === String(entry.symbol_id);
  const record = createDefaultAnswerRecord({
    session_id: entry.session_id,
    symbol_id: entry.symbol_id,
    user_answer: entry.user_answer,
    correct: isCorrect ? "true" : "false",
    latency_ms: "0",
    mistake_reason: isCorrect ? "" : "识别错误",
    op_id: entry.op_id,
    settled_by: leaseId
  });
  const { id: _recordId, ...recordData } = record;
  const recordId = await add(STORES.ANSWER_RECORDS, recordData);
  record.id = recordId as number;

  // 更新会话分数与已答题数
  const session = await getByKey<PracticeSession>(STORES.SESSIONS, entry.session_id);
  if (session) {
    session.answered_count += 1;
    if (isCorrect) session.score += 1;
    else session.mistake_count += 1;
    await put(STORES.SESSIONS, session);
  }

  // 标记账本操作为已结算
  entry.status = "settled";
  entry.lease_id = leaseId;
  entry.settled_at = new Date().toISOString();
  await put(STORES.LEDGER_ENTRIES, entry);

  logWrite("LedgerEntry", 1, { op_id: entry.op_id, session_id: entry.session_id, correct: isCorrect });
  return record;
}

/**
 * 撤账一笔待结算账本操作：标记为 revoked，不产生答题记录。
 * 用于卡片/课程变化后未完成题目失效。
 */
export async function revokeEntry(
  entry: LedgerEntry,
  reason: string
): Promise<LedgerEntry> {
  if (entry.status !== "pending") return entry;
  entry.status = "revoked";
  entry.revoke_reason = reason;
  entry.revoked_at = new Date().toISOString();
  await put(STORES.LEDGER_ENTRIES, entry);
  logWrite("LedgerEntry", 2, { op_id: entry.op_id, reason });
  return entry;
}

/**
 * 读取某会话的所有待结算操作。
 */
export async function getPendingEntries(sessionId: number): Promise<LedgerEntry[]> {
  const entries = await getByIndex<LedgerEntry>(STORES.LEDGER_ENTRIES, "session_id", sessionId);
  return entries.filter((e) => e.status === "pending");
}

/**
 * 读取某会话的所有已结算操作。
 */
export async function getSettledEntries(sessionId: number): Promise<LedgerEntry[]> {
  const entries = await getByIndex<LedgerEntry>(STORES.LEDGER_ENTRIES, "session_id", sessionId);
  return entries.filter((e) => e.status === "settled");
}

/**
 * 读取某会话的所有答题记录。
 */
export async function getAnswerRecords(sessionId: number): Promise<AnswerRecord[]> {
  return getByIndex<AnswerRecord>(STORES.ANSWER_RECORDS, "session_id", sessionId);
}
