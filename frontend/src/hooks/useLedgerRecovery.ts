import { useEffect, useCallback, useRef } from "react";
import { useRecoveryStore } from "../stores/RecoveryStore";

/**
 * 账本恢复 hook：应用启动时重启崩溃恢复，补齐或撤掉未结算记录。
 */
export function useLedgerRecovery() {
  const { recovering, results, lastRecoveredAt, recover } = useRecoveryStore();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void recover();
  }, [recover]);

  const rerun = useCallback(() => recover(), [recover]);

  return { recovering, results, lastRecoveredAt, rerun };
}
