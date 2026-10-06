import { create } from "zustand";
import { listAnswerRecord, listAnswerRecordBySession } from "../api/AnswerRecord";
import type { AnswerRecord } from "../types/AnswerRecord";
import { isLedgerError } from "../services/LedgerError";

type State = {
  rows: AnswerRecord[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  loadBySession: (sessionId: number) => Promise<void>;
  /** 错题本：只取已结算且答错的记录，按冻结快照的错因归类 */
  loadMistakes: () => Promise<AnswerRecord[]>;
};

export const useAnswerRecordStore = create<State>((set) => ({
  rows: [],
  loading: false,
  error: null,
  async load() {
    set({ loading: true, error: null });
    try {
      set({ rows: await listAnswerRecord(), loading: false });
    } catch (error) {
      set({ loading: false, error: isLedgerError(error) ? error.message : String(error) });
    }
  },
  async loadBySession(sessionId) {
    set({ loading: true, error: null });
    try {
      set({ rows: await listAnswerRecordBySession(sessionId), loading: false });
    } catch (error) {
      set({ loading: false, error: isLedgerError(error) ? error.message : String(error) });
    }
  },
  async loadMistakes() {
    set({ loading: true, error: null });
    try {
      const rows = await listAnswerRecord();
      const mistakes = rows.filter((r) => r.status === "SETTLED" && !r.correct);
      set({ rows: mistakes, loading: false });
      return mistakes;
    } catch (error) {
      set({ loading: false, error: isLedgerError(error) ? error.message : String(error) });
      return [];
    }
  }
}));
