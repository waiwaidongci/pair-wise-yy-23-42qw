import type { SessionLock } from "../types/SessionLock";

export const createDefaultSessionLock = (overrides: Partial<SessionLock> = {}): SessionLock => ({
  session_id: 0,
  lease_id: "",
  acquired_at: new Date(0).toISOString(),
  expires_at: new Date(0).toISOString(),
  ...overrides
});

export const createSessionLockForm = createDefaultSessionLock;
export const createSessionLockResponse = createDefaultSessionLock;
