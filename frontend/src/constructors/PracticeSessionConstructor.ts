import type { PracticeSession, LessonSnapshot, SymbolSnapshot } from "../types/PracticeSession";
import type { Lesson } from "../types/Lesson";
import type { BrailleSymbol } from "../types/BrailleSymbol";
import { PracticeModes } from "../constants/PracticeMode";

/** 开练瞬间冻结课程快照 */
export function buildLessonSnapshot(lesson: Lesson): LessonSnapshot {
  return {
    id: lesson.id,
    title: lesson.title,
    stage: lesson.stage,
    symbol_ids: [...lesson.symbol_ids],
    estimated_minutes: lesson.estimated_minutes,
    unlock_rule: lesson.unlock_rule,
    version: lesson.version
  };
}

/** 开练瞬间冻结卡片快照（只保留课程涉及的卡片） */
export function buildSymbolSnapshot(symbol: BrailleSymbol): SymbolSnapshot {
  return {
    id: symbol.id,
    cell_pattern: symbol.cell_pattern,
    letter: symbol.letter,
    pinyin: symbol.pinyin,
    category: symbol.category,
    difficulty: symbol.difficulty,
    audio_hint_key: symbol.audio_hint_key,
    version: symbol.version
  };
}

/** 会话内容指纹：课程版本 + 每张卡片版本，改版即变 */
export function buildContentFingerprint(lesson: Lesson, symbols: BrailleSymbol[]): string {
  const symbolPart = symbols
    .map((s) => `${s.id}@${s.version}:${s.cell_pattern}:${s.letter}`)
    .sort()
    .join("|");
  return `lesson=${lesson.id}@${lesson.version};symbols=${symbolPart}`;
}

export interface NewSessionParams {
  id: number;
  lesson: Lesson;
  symbols: BrailleSymbol[];
  mode: string;
  pendingSymbolIds: number[];
  ownerTab: string;
  now: string;
}

/** 开练构造：冻结课程与卡片快照的 PracticeSession */
export function createPracticeSessionFromSnapshot(params: NewSessionParams): PracticeSession {
  const symbolSnapshots: Record<number, SymbolSnapshot> = {};
  for (const symbol of params.symbols) {
    symbolSnapshots[symbol.id] = buildSymbolSnapshot(symbol);
  }
  return {
    id: params.id,
    lesson_id: params.lesson.id,
    mode: (PracticeModes as readonly string[]).includes(params.mode) ? (params.mode as PracticeSession["mode"]) : PracticeModes[0],
    started_at: params.now,
    finished_at: null,
    score: 0,
    mistake_count: 0,
    status: "RUNNING",
    lesson_snapshot: buildLessonSnapshot(params.lesson),
    symbol_snapshots: symbolSnapshots,
    content_fingerprint: buildContentFingerprint(params.lesson, params.symbols),
    answered_count: 0,
    pending_symbol_ids: [...params.pendingSymbolIds],
    current_symbol_id: params.pendingSymbolIds[0] ?? null,
    owner_tab: params.ownerTab,
    last_active_at: params.now
  };
}

export const createDefaultPracticeSession = (overrides: Partial<PracticeSession> = {}): PracticeSession => ({
  id: 0,
  lesson_id: 0,
  mode: PracticeModes[0],
  started_at: new Date(0).toISOString(),
  finished_at: null,
  score: 0,
  mistake_count: 0,
  status: "RUNNING",
  lesson_snapshot: null,
  symbol_snapshots: {},
  content_fingerprint: "",
  answered_count: 0,
  pending_symbol_ids: [],
  current_symbol_id: null,
  owner_tab: "",
  last_active_at: new Date(0).toISOString(),
  ...overrides
});

export const createPracticeSessionForm = createDefaultPracticeSession;
export const createPracticeSessionResponse = createDefaultPracticeSession;
