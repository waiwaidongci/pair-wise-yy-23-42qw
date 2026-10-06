import { useEffect, useState } from "react";
import { initLedger } from "../db/ledgerInit";
import { recoverLedger } from "../services/PracticeLedgerService";
import { preemptiveCacheCleanup } from "../services/CacheService";

export type LedgerBootState = "booting" | "recovering" | "ready" | "error";

/**
 * 账本就绪钩子：初始化 IndexedDB、空间预警清缓存、崩溃恢复。
 * 页面在 ready 前不发起写操作。
 */
export function useIndexedDbStore(): { state: LedgerBootState; error: string | null } {
  const [state, setState] = useState<LedgerBootState>("booting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initLedger();
        if (cancelled) return;
        setState("recovering");
        await preemptiveCacheCleanup().catch(() => false);
        await recoverLedger();
        if (!cancelled) setState("ready");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { state, error };
}
