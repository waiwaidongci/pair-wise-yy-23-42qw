import type { PracticeSession } from "../types/PracticeSession";

export const createDefaultPracticeSession = (overrides: Partial<PracticeSession> = {}): PracticeSession => ({
  id: 1 as never,
  lesson_id: 1 as never,
  mode: "mode 1" as never,
  started_at: "2026-06-11T09:00:00Z" as never,
  finished_at: "2026-06-11T09:00:00Z" as never,
  score: "LOW" as never,
  mistake_count: "mistake count 1" as never,
  ...overrides
});

export const createPracticeSessionForm = createDefaultPracticeSession;
export const createPracticeSessionResponse = createDefaultPracticeSession;
