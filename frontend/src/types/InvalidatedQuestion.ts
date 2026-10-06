/**
 * 课程/卡片改版后，未完成题目失效与重排的台账条目。
 * 每次练习会话恢复或提交前做一次 reconcile，失效题目落本表并重排队列。
 */
export const InvalidationReason = ["LESSON_CHANGED", "SYMBOL_CHANGED", "SYMBOL_REMOVED"] as const;
export type InvalidationReason = (typeof InvalidationReason)[number];

export interface InvalidatedQuestion {
  id: number;
  session_id: number;
  symbol_id: number;
  reason: InvalidationReason;
  /** 失效时冻结的旧版本号，解释“旧错因失去依据”的具体来源 */
  frozen_version: number;
  current_version: number;
  detected_at: string;
}
