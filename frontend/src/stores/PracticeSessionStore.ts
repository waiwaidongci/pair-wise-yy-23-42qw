import { create } from "zustand";
import { listPracticeSession } from "../api/PracticeSession";
import type { PracticeSession } from "../types/PracticeSession";

type State = { rows: PracticeSession[]; loading: boolean; load: () => Promise<void> };

export const usePracticeSessionStore = create<State>((set) => ({
  rows: [],
  loading: false,
  async load() {
    set({ loading: true });
    set({ rows: await listPracticeSession(), loading: false });
  }
}));
