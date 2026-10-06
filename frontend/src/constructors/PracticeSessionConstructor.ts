import type { PracticeSession } from "../types/PracticeSession";

export const createDefaultPracticeSession = (overrides: Partial<PracticeSession> = {}): PracticeSession => ({
  id: 0,
  lesson_id: 0,
  mode: "CELL_TO_TEXT",
  started_at: new Date(0).toISOString(),
  finished_at: null,
  score: 0,
  mistake_count: 0,
  status: "active",
  snapshot_id: 0,
  version_hash: "",
  total_questions: 0,
  answered_count: 0,
  ...overrides
});

export const createPracticeSessionForm = createDefaultPracticeSession;
export const createPracticeSessionResponse = createDefaultPracticeSession;
