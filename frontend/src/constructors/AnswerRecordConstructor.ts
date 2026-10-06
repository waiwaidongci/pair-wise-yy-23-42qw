import type { AnswerRecord } from "../types/AnswerRecord";

export const createDefaultAnswerRecord = (overrides: Partial<AnswerRecord> = {}): AnswerRecord => ({
  id: 1 as never,
  session_id: 1 as never,
  symbol_id: 1 as never,
  user_answer: "user answer 1" as never,
  correct: "correct 1" as never,
  latency_ms: "latency ms 1" as never,
  mistake_reason: "mistake reason 1" as never,
  ...overrides
});

export const createAnswerRecordForm = createDefaultAnswerRecord;
export const createAnswerRecordResponse = createDefaultAnswerRecord;
