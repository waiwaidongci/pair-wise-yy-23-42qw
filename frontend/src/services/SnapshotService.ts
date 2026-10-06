import { STORES, getByKey, put, withTransaction } from "../utils/ledgerDb";
import type { SessionSnapshot } from "../types/SessionSnapshot";
import type { Lesson } from "../types/Lesson";
import type { BrailleSymbol } from "../types/BrailleSymbol";
import { computeSnapshotHash } from "../utils/snapshotHasher";
import { createDefaultSessionSnapshot } from "../constructors/SessionSnapshotConstructor";
import { logWrite } from "../utils/logger";

/**
 * 快照服务：开练时冻结课程与卡片快照，变化时判定失效并重排。
 */

/**
 * 冻结会话快照。把当前课程与卡片数据固化为不可变快照。
 */
export async function freezeSnapshot(
  sessionId: number,
  lesson: Lesson,
  symbols: BrailleSymbol[],
  questionOrder: number[]
): Promise<SessionSnapshot> {
  const versionHash = await computeSnapshotHash(lesson, symbols);
  const snapshot = createDefaultSessionSnapshot({
    session_id: sessionId,
    lesson_id: lesson.id,
    lesson_snapshot: lesson,
    symbol_snapshots: symbols,
    question_order: questionOrder,
    version_hash: versionHash,
    frozen_at: new Date().toISOString()
  });
  await put(STORES.SNAPSHOTS, snapshot);
  logWrite("SessionSnapshot", 0, { session_id: sessionId, version_hash: versionHash });
  return snapshot;
}

/**
 * 读取会话快照。
 */
export async function getSnapshot(sessionId: number): Promise<SessionSnapshot | undefined> {
  return getByKey<SessionSnapshot>(STORES.SNAPSHOTS, sessionId);
}

/**
 * 判定快照是否已失效（课程或卡片发生变化）。
 */
export async function isSnapshotStale(
  snapshot: SessionSnapshot,
  lesson: Lesson,
  symbols: BrailleSymbol[]
): Promise<boolean> {
  const currentHash = await computeSnapshotHash(lesson, symbols);
  return currentHash !== snapshot.version_hash;
}

/**
 * 重建快照：课程或卡片变化后，用当前数据重排题目顺序。
 * 返回新快照；若课程已删除则返回 null（会话应放弃）。
 */
export async function rebuildSnapshot(
  sessionId: number,
  lesson: Lesson | undefined,
  symbols: BrailleSymbol[]
): Promise<SessionSnapshot | null> {
  if (!lesson) return null;
  const questionOrder = buildQuestionOrder(lesson, symbols);
  const snapshot = await freezeSnapshot(sessionId, lesson, symbols, questionOrder);
  logWrite("SessionSnapshot", 2, { session_id: sessionId, version_hash: snapshot.version_hash });
  return snapshot;
}

/**
 * 根据课程的 symbol_ids 与可用卡片生成题目顺序。
 * 课程中引用但已删除的卡片会被过滤。
 */
export function buildQuestionOrder(lesson: Lesson, symbols: BrailleSymbol[]): number[] {
  const available = new Set(symbols.map((s) => s.id));
  return lesson.symbol_ids.filter((id) => available.has(id));
}

/**
 * 清理可重建快照缓存（不影响账本）。
 */
export async function purgeSnapshots(): Promise<number> {
  return withTransaction(STORES.SNAPSHOTS, "readwrite", async (stores) => {
    const all = stores[STORES.SNAPSHOTS].getAll() as IDBRequest<SessionSnapshot[]>;
    const snapshots = await new Promise<SessionSnapshot[]>((resolve, reject) => {
      all.onsuccess = () => resolve(all.result);
      all.onerror = () => reject(all.error);
    });
    stores[STORES.SNAPSHOTS].clear();
    logWrite("SessionSnapshot", 3, { purged: snapshots.length });
    return snapshots.length;
  });
}
