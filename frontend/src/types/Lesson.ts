export interface Lesson {
  id: number;
  title: string;
  symbol_ids: number[];
  stage: string;
  estimated_minutes: number;
  unlock_rule: string;
}
