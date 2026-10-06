import { create } from "zustand";
import { recoverActiveSessions, type RecoveryResult } from "../services/RecoveryService";

type State = {
  recovering: boolean;
  results: RecoveryResult[];
  lastRecoveredAt: string | null;
  recover: () => Promise<RecoveryResult[]>;
};

let inFlight: Promise<RecoveryResult[]> | null = null;

export const useRecoveryStore = create<State>((set) => ({
  recovering: false,
  results: [],
  lastRecoveredAt: null,
  async recover() {
    // 防止多个 hook 实例并发执行恢复
    if (inFlight) return inFlight;
    set({ recovering: true });
    inFlight = recoverActiveSessions()
      .then((results) => {
        set({ recovering: false, results, lastRecoveredAt: new Date().toISOString() });
        return results;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  }
}));
