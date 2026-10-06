import { STORES, getAll, getByKey, put } from "../utils/ledgerDb";
import type { BrailleSymbol } from "../types/BrailleSymbol";
import { computeSnapshotHash } from "../utils/snapshotHasher";
import { logWrite } from "../utils/logger";

export async function listBrailleSymbol(): Promise<BrailleSymbol[]> {
  return getAll<BrailleSymbol>(STORES.SYMBOLS);
}

export async function getBrailleSymbol(id: number): Promise<BrailleSymbol | undefined> {
  return getByKey<BrailleSymbol>(STORES.SYMBOLS, id);
}

/**
 * 保存卡片：更新版本哈希，使引用该卡片的未完成会话快照失效重排。
 */
export async function saveBrailleSymbol(payload: BrailleSymbol): Promise<BrailleSymbol> {
  const allLessons = await getAll<import("../types/Lesson").Lesson>(STORES.LESSONS);
  // 卡片变化会影响所有引用它的课程快照版本
  const hash = await computeSnapshotHash(
    { id: 0, title: "", symbol_ids: [], stage: "", estimated_minutes: 0, unlock_rule: "", version_hash: "", updated_at: "" },
    [payload]
  );
  payload.version_hash = hash;
  payload.updated_at = new Date().toISOString();
  await put(STORES.SYMBOLS, payload);
  logWrite("BrailleSymbol", 1, { symbol_id: payload.id, version_hash: hash });
  return payload;
}
