export interface AnswerRecord {
  id: number;
  session_id: number;
  symbol_id: number;
  user_answer: string;
  correct: string;
  latency_ms: string;
  mistake_reason: string;
}
