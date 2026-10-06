import type { Lesson } from "../types/Lesson";

export const createDefaultLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: 1 as never,
  title: "title 1" as never,
  symbol_ids: [1,2] as number[],
  stage: "stage 1" as never,
  estimated_minutes: "estimated minutes 1" as never,
  unlock_rule: "unlock rule 1" as never,
  ...overrides
});

export const createLessonForm = createDefaultLesson;
export const createLessonResponse = createDefaultLesson;
