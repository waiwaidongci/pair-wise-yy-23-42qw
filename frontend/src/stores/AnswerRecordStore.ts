import { create } from "zustand";
import { listAnswerRecord, listAnswerRecordBySession } from "../api/AnswerRecord";
import type { AnswerRecord } from "../types/AnswerRecord";

type State = {
  rows: AnswerRecord[];
  loading: boolean;
  load: () => Promise<void>;
  loadBySession: (sessionId: number) => Promise<void>;
};

export const useAnswerRecordStore = create<State>((set) => ({
  rows: [],
  loading: false,
  async load() {
    set({ loading: true });
    set({ rows: await listAnswerRecord(), loading: false });
  },
  async loadBySession(sessionId) {
    set({ loading: true });
    set({ rows: await listAnswerRecordBySession(sessionId), loading: false });
  }
}));
