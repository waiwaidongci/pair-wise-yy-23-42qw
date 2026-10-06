import type { Lesson } from "../types/Lesson";

export const createDefaultLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: 0,
  title: "",
  symbol_ids: [],
  stage: "STAGE_1",
  estimated_minutes: 10,
  unlock_rule: "NONE",
  version: 1,
  updated_at: new Date(0).toISOString(),
  ...overrides
});

export const createLessonForm = createDefaultLesson;
export const createLessonResponse = createDefaultLesson;
