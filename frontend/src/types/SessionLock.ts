export interface SessionLock {
  session_id: number;
  lease_id: string;
  acquired_at: string;
  expires_at: string;
}
