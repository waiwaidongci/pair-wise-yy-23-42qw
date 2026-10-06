import { STORES, getAll, getByKey, put, acquireSessionLock, releaseSessionLock } from "../utils/ledgerDb";
import type { PracticeSession } from "../types/PracticeSession";
import type { Lesson } from "../types/Lesson";
import type { BrailleSymbol } from "../types/BrailleSymbol";
import { getSnapshot, isSnapshotStale, rebuildSnapshot } from "./SnapshotService";
import { getPendingEntries, settleEntry, revokeEntry } from "./LedgerService";
import { generateLeaseId } from "../utils/operationId";
import { logWrite, logError } from "../utils/logger";
import { ERROR_CODES } from "../constants/errorCodes";

const LOCK_TTL_MS = 15000;

export interface RecoveryResult {
  session_id: number;
  settled: number;
  revoked: number;
  rearranged: boolean;
  reason: string | null;
}

/**
 * 崩溃恢复服务：重启后补齐或撤掉未结算记录。
 *
 * 流程：
 * 1. 找出所有进行中的会话
 * 2. 跳过仍被活跃标签页持锁的会话（避免与正在提交的标签页冲突）
 * 3. 对无主会话：读取冻结快照与当前课程/卡片
 * 4. 若快照未失效 → 补齐所有待结算操作
 * 5. 若快照已失效 → 撤掉待结算操作，并用当前数据重排题目
 */
export async function recoverActiveSessions(): Promise<RecoveryResult[]> {
  const sessions = await getAll<PracticeSession>(STORES.SESSIONS);
  const active = sessions.filter((s) => s.status === "active");
  const results: RecoveryResult[] = [];

  for (const session of active) {
    const result = await recoverSession(session);
    results.push(result);
  }

  logWrite("Recovery", 3, { recovered: results.length });
  return results;
}

async function recoverSession(session: PracticeSession): Promise<RecoveryResult> {
  const pending = await getPendingEntries(session.id);
  if (pending.length === 0) {
    return { session_id: session.id, settled: 0, revoked: 0, rearranged: false, reason: null };
  }

  // 跳过仍被活跃标签页持锁的会话
  const lock = await getSessionLock(session.id);
  if (lock && new Date(lock.expires_at).getTime() > Date.now()) {
    return { session_id: session.id, settled: 0, revoked: 0, rearranged: false, reason: "lock_held" };
  }

  const leaseId = generateLeaseId();
  const acquired = await acquireSessionLock(session.id, leaseId, LOCK_TTL_MS);
  if (!acquired) {
    return { session_id: session.id, settled: 0, revoked: 0, rearranged: false, reason: "lock_held" };
  }

  try {
    const snapshot = await getSnapshot(session.id);
    if (!snapshot) {
      for (const entry of pending) {
        await revokeEntry(entry, ERROR_CODES.SNAPSHOT_NOT_FOUND);
      }
      logError("Recovery", 2, new Error(ERROR_CODES.SNAPSHOT_NOT_FOUND), { session_id: session.id });
      return {
        session_id: session.id,
        settled: 0,
        revoked: pending.length,
        rearranged: false,
        reason: ERROR_CODES.SNAPSHOT_NOT_FOUND
      };
    }

    const lesson = await getByKey<Lesson>(STORES.LESSONS, session.lesson_id);
    const allSymbols = await getAll<BrailleSymbol>(STORES.SYMBOLS);
    const stale = lesson ? await isSnapshotStale(snapshot, lesson, allSymbols) : true;

    if (!stale) {
      // 快照未失效：补齐所有待结算操作
      let settled = 0;
      for (const entry of pending) {
        try {
          await settleEntry(entry, leaseId);
          settled += 1;
        } catch (err) {
          logError("Recovery", 1, err, { op_id: entry.op_id });
        }
      }
      logWrite("Recovery", 1, { session_id: session.id, settled });
      return { session_id: session.id, settled, revoked: 0, rearranged: false, reason: null };
    }

    // 快照已失效：撤掉待结算操作，重排题目
    for (const entry of pending) {
      await revokeEntry(entry, ERROR_CODES.SNAPSHOT_STALE);
    }
    const rebuilt = await rebuildSnapshot(session.id, lesson, allSymbols);
    if (rebuilt) {
      session.version_hash = rebuilt.version_hash;
      session.snapshot_id = rebuilt.session_id;
      session.total_questions = rebuilt.question_order.length;
      await put(STORES.SESSIONS, session);
    }
    logWrite("Recovery", 2, { session_id: session.id, revoked: pending.length });
    return {
      session_id: session.id,
      settled: 0,
      revoked: pending.length,
      rearranged: true,
      reason: ERROR_CODES.SNAPSHOT_STALE
    };
  } finally {
    await releaseSessionLock(session.id, leaseId);
  }
}

async function getSessionLock(sessionId: number): Promise<{ expires_at: string } | undefined> {
  const { getByKey } = await import("../utils/ledgerDb");
  return getByKey<{ expires_at: string }>(STORES.SESSION_LOCKS, sessionId);
}

/**
 * 恢复单个会话的待结算操作（供提交时调用）。
 */
export async function recoverPendingForSession(sessionId: number): Promise<number> {
  const pending = await getPendingEntries(sessionId);
  if (pending.length === 0) return 0;
  const leaseId = generateLeaseId();
  let settled = 0;
  for (const entry of pending) {
    try {
      await settleEntry(entry, leaseId);
      settled += 1;
    } catch {
      // 忽略单条失败，继续处理
    }
  }
  return settled;
}
