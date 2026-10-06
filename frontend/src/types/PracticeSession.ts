export interface PracticeSession {
  id: number;
  lesson_id: number;
  mode: string;
  started_at: string;
  finished_at: string | null;
  score: number;
  mistake_count: number;
  status: "active" | "completed" | "abandoned";
  snapshot_id: number;
  version_hash: string;
  total_questions: number;
  answered_count: number;
}
