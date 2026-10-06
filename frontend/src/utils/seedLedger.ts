import { STORES, getAll, put } from "./ledgerDb";
import { mockData } from "../mocks/seedData";
import { computeSnapshotHash } from "./snapshotHasher";
import type { Lesson } from "../types/Lesson";
import type { BrailleSymbol } from "../types/BrailleSymbol";

/**
 * 首次运行时把种子数据写入账本数据库。
 * 已存在数据则跳过，保证账本不被覆盖。
 */
export async function seedLedgerIfEmpty(): Promise<void> {
  const existingLessons = await getAll<Lesson>(STORES.LESSONS);
  if (existingLessons.length > 0) return;

  const symbols = mockData.brailleSymbol as unknown as BrailleSymbol[];
  const lessons = mockData.lesson as unknown as Lesson[];

  // 先写卡片
  for (const symbol of symbols) {
    const hash = await computeSnapshotHash(
      { id: 0, title: "", symbol_ids: [], stage: "", estimated_minutes: 0, unlock_rule: "", version_hash: "", updated_at: "" },
      [symbol]
    );
    symbol.version_hash = hash;
    await put(STORES.SYMBOLS, symbol);
  }

  // 再写课程（课程哈希依赖卡片）
  for (const lesson of lessons) {
    const hash = await computeSnapshotHash(lesson, symbols);
    lesson.version_hash = hash;
    await put(STORES.LESSONS, lesson);
  }
}
