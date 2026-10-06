import type { AnswerRecord, AnswerSymbolSnapshot } from "../types/AnswerRecord";
import type { SymbolSnapshot } from "../types/PracticeSession";

/** 把开练时冻结的卡片快照钉到答题记录上：老师改版后旧错因仍有依据 */
export function buildAnswerSymbolSnapshot(snapshot: SymbolSnapshot): AnswerSymbolSnapshot {
  return {
    letter: snapshot.letter,
    cell_pattern: snapshot.cell_pattern,
    pinyin: snapshot.pinyin,
    category: snapshot.category,
    difficulty: snapshot.difficulty,
    version: snapshot.version
  };
}

export interface PendingAnswerParams {
  id: number;
  sessionId: number;
  symbolId: number;
  userAnswer: string;
  expectedAnswer: string;
  correct: boolean;
  latencyMs: number;
  mistakeReason: string;
  idempotencyKey: string;
  opSeq: number;
  snapshot: SymbolSnapshot;
  sourceTab: string;
  now: string;
}

/** 先记操作号阶段的答题记录（PENDING），结算后才转 SETTLED */
export function createPendingAnswerRecord(params: PendingAnswerParams): AnswerRecord {
  return {
    id: params.id,
    session_id: params.sessionId,
    symbol_id: params.symbolId,
    user_answer: params.userAnswer,
    expected_answer: params.expectedAnswer,
    correct: params.correct,
    latency_ms: params.latencyMs,
    mistake_reason: params.mistakeReason,
    status: "PENDING",
    idempotency_key: params.idempotencyKey,
    op_seq: params.opSeq,
    symbol_snapshot: buildAnswerSymbolSnapshot(params.snapshot),
    created_at: params.now,
    settled_at: null,
    source_tab: params.sourceTab
  };
}

export const createDefaultAnswerRecord = (overrides: Partial<AnswerRecord> = {}): AnswerRecord => ({
  id: 0,
  session_id: 0,
  symbol_id: 0,
  user_answer: "",
  expected_answer: "",
  correct: false,
  latency_ms: 0,
  mistake_reason: "",
  status: "PENDING",
  idempotency_key: "",
  op_seq: 0,
  symbol_snapshot: null,
  created_at: new Date(0).toISOString(),
  settled_at: null,
  source_tab: "",
  ...overrides
});

export const createAnswerRecordForm = createDefaultAnswerRecord;
export const createAnswerRecordResponse = createDefaultAnswerRecord;
