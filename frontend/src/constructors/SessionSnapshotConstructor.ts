import type { SessionSnapshot } from "../types/SessionSnapshot";
import { createDefaultLesson } from "./LessonConstructor";
import { createDefaultBrailleSymbol } from "./BrailleSymbolConstructor";

export const createDefaultSessionSnapshot = (overrides: Partial<SessionSnapshot> = {}): SessionSnapshot => ({
  session_id: 0,
  lesson_id: 0,
  lesson_snapshot: createDefaultLesson(),
  symbol_snapshots: [],
  question_order: [],
  version_hash: "",
  frozen_at: new Date(0).toISOString(),
  ...overrides
});

export const createSessionSnapshotForm = createDefaultSessionSnapshot;
export const createSessionSnapshotResponse = createDefaultSessionSnapshot;
