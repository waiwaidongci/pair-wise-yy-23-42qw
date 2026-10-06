import {
  appendLedgerEntry,
  STORES,
  getByIndex,
  withSessionLock,
  getByKey,
  getAll,
  acquireSessionLock,
  releaseSessionLock
} from "../utils/ledgerDb";
import type { LedgerEntry } from "../types/LedgerEntry";
import type { AnswerRecord } from "../types/AnswerRecord";
import { settleEntry } from "../services/LedgerService";
import { generateClientId, generateLeaseId } from "../utils/operationId";
import { logWrite, logError } from "../utils/logger";
import { ERROR_CODES } from "../constants/errorCodes";

const LOCK_TTL_MS = 15000;

export interface SubmitAnswerResult {
  settled: boolean;
  op_id: number;
  record: AnswerRecord | null;
  reason: string | null;
}

/**
 * 提交答案：先获取会话锁，再记操作号（写操作号），最后在锁保护下结算。
 * 若另一标签页持有锁，则不结算，保留现场（返回 settled=false）。
 */
export async function submitAnswer(
  sessionId: number,
  symbolId: number,
  userAnswer: string
): Promise<SubmitAnswerResult> {
  const clientId = generateClientId();
  const leaseId = generateLeaseId();

  // 1. 先获取会话锁，保证并发只结算一笔
  const acquired = await acquireSessionLock(sessionId, leaseId, LOCK_TTL_MS);
  if (!acquired) {
    logError("SessionLock", 3, new Error(ERROR_CODES.LEDGER_LOCK_HELD), { session_id: sessionId });
    return {
      settled: false,
      op_id: 0,
      record: null,
      reason: ERROR_CODES.LEDGER_LOCK_HELD
    };
  }

  try {
    // 2. 记操作号（write-ahead）
    const entry = await appendLedgerEntry({
      session_id: sessionId,
      symbol_id: symbolId,
      user_answer: userAnswer,
      status: "pending",
      client_id: clientId,
      lease_id: null,
      created_at: new Date().toISOString(),
      settled_at: null,
      revoked_at: null,
      revoke_reason: null
    });
    logWrite("LedgerEntry", 0, { op_id: entry.op_id, session_id: sessionId });

    // 3. 在锁保护下结算
    const record = await settleEntry(entry, leaseId);
    return { settled: true, op_id: entry.op_id, record, reason: null };
  } finally {
    // 4. 释放锁
    await releaseSessionLock(sessionId, leaseId);
  }
}

/**
 * 列出某会话的所有账本操作。
 */
export async function listLedgerEntries(sessionId: number): Promise<LedgerEntry[]> {
  return getByIndex<LedgerEntry>(STORES.LEDGER_ENTRIES, "session_id", sessionId);
}

/**
 * 列出所有待结算操作。
 */
export async function listAllPendingEntries(): Promise<LedgerEntry[]> {
  const all = await getAll<LedgerEntry>(STORES.LEDGER_ENTRIES);
  return all.filter((e) => e.status === "pending");
}

/**
 * 列出所有已结算操作。
 */
export async function listAllSettledEntries(): Promise<LedgerEntry[]> {
  const all = await getAll<LedgerEntry>(STORES.LEDGER_ENTRIES);
  return all.filter((e) => e.status === "settled");
}
