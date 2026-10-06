import { create } from "zustand";
import {
  listLedgerEntries,
  listAllPendingEntries,
  listAllSettledEntries,
  submitAnswer
} from "../api/Ledger";
import type { LedgerEntry } from "../types/LedgerEntry";
import type { AnswerRecord } from "../types/AnswerRecord";

type SubmitResult = {
  settled: boolean;
  op_id: number;
  record: AnswerRecord | null;
  reason: string | null;
};

type State = {
  entries: LedgerEntry[];
  pending: LedgerEntry[];
  settled: LedgerEntry[];
  loading: boolean;
  lastSubmit: SubmitResult | null;
  loadBySession: (sessionId: number) => Promise<void>;
  loadPending: () => Promise<void>;
  loadSettled: () => Promise<void>;
  submit: (sessionId: number, symbolId: number, userAnswer: string) => Promise<SubmitResult>;
};

export const useLedgerStore = create<State>((set, get) => ({
  entries: [],
  pending: [],
  settled: [],
  loading: false,
  lastSubmit: null,
  async loadBySession(sessionId) {
    set({ loading: true });
    set({ entries: await listLedgerEntries(sessionId), loading: false });
  },
  async loadPending() {
    set({ loading: true });
    set({ pending: await listAllPendingEntries(), loading: false });
  },
  async loadSettled() {
    set({ loading: true });
    set({ settled: await listAllSettledEntries(), loading: false });
  },
  async submit(sessionId, symbolId, userAnswer) {
    const result = await submitAnswer(sessionId, symbolId, userAnswer);
    set({ lastSubmit: result });
    // 刷新当前会话的账本操作
    const entries = await listLedgerEntries(sessionId);
    set({ entries });
    return result;
  }
}));
