import { useEffect, useState, useCallback } from "react";
import { acquireSessionLock, releaseSessionLock } from "../utils/ledgerDb";
import { generateLeaseId } from "../utils/operationId";

const LOCK_TTL_MS = 15000;

export interface SessionLockState {
  held: boolean;
  leaseId: string | null;
  acquire: () => Promise<boolean>;
  release: () => Promise<void>;
}

/**
 * 会话锁 hook：跨标签页的原子租约，保证并发只结算一笔。
 */
export function useSessionLock(sessionId: number | null): SessionLockState {
  const [leaseId, setLeaseId] = useState<string | null>(null);
  const [held, setHeld] = useState(false);

  const acquire = useCallback(async () => {
    if (!sessionId) return false;
    const id = generateLeaseId();
    const ok = await acquireSessionLock(sessionId, id, LOCK_TTL_MS);
    if (ok) {
      setLeaseId(id);
      setHeld(true);
    }
    return ok;
  }, [sessionId]);

  const release = useCallback(async () => {
    if (!sessionId || !leaseId) return;
    await releaseSessionLock(sessionId, leaseId);
    setLeaseId(null);
    setHeld(false);
  }, [sessionId, leaseId]);

  useEffect(() => {
    return () => {
      if (sessionId && leaseId) {
        void releaseSessionLock(sessionId, leaseId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, leaseId]);

  return { held, leaseId, acquire, release };
}
