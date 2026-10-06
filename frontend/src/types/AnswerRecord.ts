/**
 * 答题记录状态（结算阶段）：
 * - PENDING  先记操作号后的未落盘阶段，崩溃后据此补齐或撤掉
 * - SETTLED  已结算，错题本/统计只认这个状态
 * - ROLLED_BACK 重启后无法补齐（缺少现场）而撤掉的记录，保留痕迹便于审计
 */
export const AnswerStatus = ["PENDING", "SETTLED", "ROLLED_BACK"] as const;
export type AnswerStatus = (typeof AnswerStatus)[number];

/** 答题记录里冻结的卡片快照字段，老师改版后旧错因仍有依据 */
export interface AnswerSymbolSnapshot {
  letter: string;
  cell_pattern: string;
  pinyin: string;
  category: string;
  difficulty: string;
  /** 冻结时的卡片版本 */
  version: number;
}

export interface AnswerRecord {
  id: number;
  session_id: number;
  symbol_id: number;
  user_answer: string;
  /** 正确答案（开练时冻结，避免卡片改版后错判） */
  expected_answer: string;
  correct: boolean;
  latency_ms: number;
  mistake_reason: string;
  status: AnswerStatus;
  /** 幂等键：同一道题（会话+题目）只结算一笔，两个标签页并发时后到的一笔丢弃 */
  idempotency_key: string;
  /** 关联操作号（AnswerOpLog.seq） */
  op_seq: number;
  /** 冻结卡片快照：旧错因永远绑定开练时的卡片内容 */
  symbol_snapshot: AnswerSymbolSnapshot | null;
  created_at: string;
  settled_at: string | null;
  /** 提交来源标签页 */
  source_tab: string;
}
