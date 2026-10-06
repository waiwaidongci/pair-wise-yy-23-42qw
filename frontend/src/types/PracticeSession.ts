import type { PracticeMode } from "./PracticeMode";

/**
 * 练习会话状态：
 * - RUNNING   开练后进行中，崩溃恢复时仍可继续
 * - RECOVERED 重启恢复时发现半截会话并已补齐/撤掉未结算记录
 * - FINISHED  正常结算完成
 * - ABANDONED 题目全部失效（课程/卡片改版）后无法继续
 */
export const SessionStatus = ["RUNNING", "RECOVERED", "FINISHED", "ABANDONED"] as const;
export type SessionStatus = (typeof SessionStatus)[number];

/** 开练时冻结的课程快照 */
export interface LessonSnapshot {
  id: number;
  title: string;
  stage: string;
  symbol_ids: number[];
  estimated_minutes: number;
  unlock_rule: string;
  /** 课程内容版本（每次保存递增），用于失效判定 */
  version: number;
}

/** 开练时冻结的点字卡片快照，答题记录的旧错因永远以它为准 */
export interface SymbolSnapshot {
  id: number;
  cell_pattern: string;
  letter: string;
  pinyin: string;
  category: string;
  difficulty: string;
  audio_hint_key: string;
  /** 卡片内容版本（每次保存递增），用于失效判定 */
  version: number;
}

export interface PracticeSession {
  id: number;
  lesson_id: number;
  mode: PracticeMode;
  started_at: string;
  finished_at: string | null;
  score: number;
  mistake_count: number;
  status: SessionStatus;
  /** 冻结的课程快照 */
  lesson_snapshot: LessonSnapshot | null;
  /** 冻结的卡片快照，按 symbol_id 索引，保证旧错因有依据 */
  symbol_snapshots: Record<number, SymbolSnapshot>;
  /** 快照版本指纹，课程或卡片改版后用于失效判定 */
  content_fingerprint: string;
  /** 已完成题量（结算成功的答题记录数） */
  answered_count: number;
  /** 未完成题目队列（失效后重排） */
  pending_symbol_ids: number[];
  /** 当前题目的 symbol_id */
  current_symbol_id: number | null;
  /** 本次会话所在标签页，用于并发提示 */
  owner_tab: string;
  /** 最近一次活动时间，崩溃判定与恢复日志使用 */
  last_active_at: string;
}
