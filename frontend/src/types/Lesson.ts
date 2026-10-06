export interface Lesson {
  id: number;
  title: string;
  symbol_ids: number[];
  stage: string;
  estimated_minutes: number;
  unlock_rule: string;
  /** 内容版本：老师每次保存递增，练习会话据此判定快照是否失效 */
  version: number;
  updated_at: string;
}
