/**
 * 可恢复账本的操作日志。
 * 答题采用两阶段：先 append 一条 SUBMIT 操作（只带操作号与意图），
 * 结算成功后把操作标 COMMITTED；崩溃后重启时：
 *  - SUBMIT 且能在 answer_records 找到 PENDING 现场 -> 补齐为 SETTLED（COMMITTED）
 *  - SUBMIT 但现场不足 -> 撤掉（ABORTED，答案记录置 ROLLED_BACK）
 */
export const OpType = ["SESSION_START", "ANSWER_SUBMIT", "ANSWER_COMMIT", "ANSWER_ABORT", "SESSION_FINISH", "SESSION_INVALIDATE"] as const;
export type OpType = (typeof OpType)[number];

export const OpStatus = ["PENDING", "COMMITTED", "ABORTED"] as const;
export type OpStatus = (typeof OpStatus)[number];

export interface AnswerOpLog {
  /** 自增操作号，账本的先后顺序唯一依据 */
  seq: number;
  type: OpType;
  status: OpStatus;
  session_id: number;
  /** ANSWER_SUBMIT 时的幂等键（会话+题目序号），保证只结算一笔 */
  idempotency_key: string;
  /** 操作来源标签页 */
  source_tab: string;
  /** 提交意图现场，重启后据此补齐；补齐失败则撤掉 */
  payload: {
    symbol_id: number;
    user_answer: string;
    latency_ms: number;
    expected_answer: string;
  } | null;
  created_at: string;
  settled_at: string | null;
}
