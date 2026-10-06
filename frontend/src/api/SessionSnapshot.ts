import { STORES, getByKey, getAll } from "../utils/ledgerDb";
import type { SessionSnapshot } from "../types/SessionSnapshot";
import type { Lesson } from "../types/Lesson";
import type { BrailleSymbol } from "../types/BrailleSymbol";
import {
  freezeSnapshot,
  getSnapshot,
  rebuildSnapshot,
  buildQuestionOrder
} from "../services/SnapshotService";
import { logWrite } from "../utils/logger";

/**
 * 冻结会话快照：开练时把课程与卡片数据固化。
 */
export async function freezeSessionSnapshot(
  sessionId: number,
  lessonId: number
): Promise<SessionSnapshot | null> {
  const lesson = await getByKey<Lesson>(STORES.LESSONS, lessonId);
  if (!lesson) return null;
  const allSymbols = await getAll<BrailleSymbol>(STORES.SYMBOLS);
  const questionOrder = buildQuestionOrder(lesson, allSymbols);
  return freezeSnapshot(sessionId, lesson, allSymbols, questionOrder);
}

/**
 * 读取会话快照。
 */
export async function getSessionSnapshot(sessionId: number): Promise<SessionSnapshot | undefined> {
  return getSnapshot(sessionId);
}

/**
 * 重建会话快照：课程或卡片变化后重排题目。
 */
export async function rebuildSessionSnapshot(sessionId: number): Promise<SessionSnapshot | null> {
  const snapshot = await getSnapshot(sessionId);
  if (!snapshot) return null;
  const lesson = await getByKey<Lesson>(STORES.LESSONS, snapshot.lesson_id);
  const allSymbols = await getAll<BrailleSymbol>(STORES.SYMBOLS);
  const rebuilt = await rebuildSnapshot(sessionId, lesson, allSymbols);
  if (rebuilt) {
    logWrite("SessionSnapshot", 2, { session_id: sessionId });
  }
  return rebuilt;
}
