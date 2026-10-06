import type { BrailleSymbol } from "../types/BrailleSymbol";
import type { Lesson } from "../types/Lesson";

/** 首次打开账本时写入的种子数据；版本号从 1 开始，老师每保存一次递增 */
export const seedBrailleSymbols: BrailleSymbol[] = [
  { id: 1, cell_pattern: "1", letter: "a", pinyin: "a", category: "LETTER", difficulty: "1", audio_hint_key: "letter:a", version: 1, updated_at: "2026-09-01T08:00:00Z" },
  { id: 2, cell_pattern: "1,2", letter: "b", pinyin: "bo", category: "LETTER", difficulty: "1", audio_hint_key: "letter:b", version: 1, updated_at: "2026-09-01T08:00:00Z" },
  { id: 3, cell_pattern: "1,4", letter: "c", pinyin: "ci", category: "LETTER", difficulty: "1", audio_hint_key: "letter:c", version: 1, updated_at: "2026-09-01T08:00:00Z" },
  { id: 4, cell_pattern: "1,4,5", letter: "d", pinyin: "de", category: "LETTER", difficulty: "2", audio_hint_key: "letter:d", version: 1, updated_at: "2026-09-01T08:00:00Z" },
  { id: 5, cell_pattern: "1,5", letter: "e", pinyin: "e", category: "LETTER", difficulty: "1", audio_hint_key: "letter:e", version: 1, updated_at: "2026-09-01T08:00:00Z" },
  { id: 6, cell_pattern: "1,2,4", letter: "f", pinyin: "fo", category: "LETTER", difficulty: "2", audio_hint_key: "letter:f", version: 1, updated_at: "2026-09-01T08:00:00Z" },
  { id: 7, cell_pattern: "1,2,4,5", letter: "g", pinyin: "ge", category: "LETTER", difficulty: "2", audio_hint_key: "letter:g", version: 1, updated_at: "2026-09-01T08:00:00Z" },
  { id: 8, cell_pattern: "1,2,5", letter: "h", pinyin: "he", category: "LETTER", difficulty: "2", audio_hint_key: "letter:h", version: 1, updated_at: "2026-09-01T08:00:00Z" },
  { id: 9, cell_pattern: "2,4", letter: "i", pinyin: "yi", category: "LETTER", difficulty: "2", audio_hint_key: "letter:i", version: 1, updated_at: "2026-09-01T08:00:00Z" },
  { id: 10, cell_pattern: "2,4,5", letter: "j", pinyin: "jie", category: "LETTER", difficulty: "2", audio_hint_key: "letter:j", version: 1, updated_at: "2026-09-01T08:00:00Z" },
  { id: 11, cell_pattern: "1", letter: "1", pinyin: "yi1", category: "NUMBER", difficulty: "3", audio_hint_key: "digit:1", version: 1, updated_at: "2026-09-01T08:00:00Z" },
  { id: 12, cell_pattern: "2", letter: ",", pinyin: "douhao", category: "PUNCTUATION", difficulty: "3", audio_hint_key: "punct:comma", version: 1, updated_at: "2026-09-01T08:00:00Z" }
];

export const seedLessons: Lesson[] = [
  { id: 1, title: "第一课：a-e 基础点位", symbol_ids: [1, 2, 3, 4, 5], stage: "STAGE_1", estimated_minutes: 10, unlock_rule: "NONE", version: 1, updated_at: "2026-09-01T08:00:00Z" },
  { id: 2, title: "第二课：f-j 组合点位", symbol_ids: [6, 7, 8, 9, 10], stage: "STAGE_2", estimated_minutes: 12, unlock_rule: "FINISH_LESSON_1", version: 1, updated_at: "2026-09-01T08:00:00Z" },
  { id: 3, title: "第三课：数字与标点", symbol_ids: [11, 12, 1, 5], stage: "STAGE_3", estimated_minutes: 8, unlock_rule: "FINISH_LESSON_2", version: 1, updated_at: "2026-09-01T08:00:00Z" }
];

/** 兼容旧聚合结构（工作台总览仍可使用） */
export const mockData = {
  brailleSymbol: seedBrailleSymbols,
  lesson: seedLessons,
  practiceSession: [] as Record<string, unknown>[],
  answerRecord: [] as Record<string, unknown>[]
} as const;
