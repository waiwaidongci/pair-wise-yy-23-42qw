import type { Lesson } from "./Lesson";
import type { BrailleSymbol } from "./BrailleSymbol";

export interface SessionSnapshot {
  session_id: number;
  lesson_id: number;
  lesson_snapshot: Lesson;
  symbol_snapshots: BrailleSymbol[];
  question_order: number[];
  version_hash: string;
  frozen_at: string;
}
