import { STORES, getAll, getByKey, put } from "../utils/ledgerDb";
import type { Lesson } from "../types/Lesson";
import { computeSnapshotHash } from "../utils/snapshotHasher";
import { logWrite } from "../utils/logger";

export async function listLesson(): Promise<Lesson[]> {
  return getAll<Lesson>(STORES.LESSONS);
}

export async function getLesson(id: number): Promise<Lesson | undefined> {
  return getByKey<Lesson>(STORES.LESSONS, id);
}

/**
 * 保存课程：更新版本哈希，使依赖该课程的未完成会话快照失效重排。
 */
export async function saveLesson(payload: Lesson): Promise<Lesson> {
  const allSymbols = await getAll<import("../types/BrailleSymbol").BrailleSymbol>(STORES.SYMBOLS);
  const hash = await computeSnapshotHash(payload, allSymbols);
  payload.version_hash = hash;
  payload.updated_at = new Date().toISOString();
  await put(STORES.LESSONS, payload);
  logWrite("Lesson", 1, { lesson_id: payload.id, version_hash: hash });
  return payload;
}
