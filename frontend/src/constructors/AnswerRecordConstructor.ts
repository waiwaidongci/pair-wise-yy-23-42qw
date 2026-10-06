import type { AnswerRecord } from "../types/AnswerRecord";

export const createDefaultAnswerRecord = (overrides: Partial<AnswerRecord> = {}): AnswerRecord => ({
  id: 0,
  session_id: 0,
  symbol_id: 0,
  user_answer: "",
  correct: "false",
  latency_ms: "0",
  mistake_reason: "",
  op_id: 0,
  settled_by: "",
  ...overrides
});

export const createAnswerRecordForm = createDefaultAnswerRecord;
export const createAnswerRecordResponse = createDefaultAnswerRecord;
