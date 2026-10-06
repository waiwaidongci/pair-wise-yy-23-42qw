import { create } from "zustand";
import {
  listPracticeSession,
  createPracticeSession,
  completePracticeSession
} from "../api/PracticeSession";
import type { PracticeSession } from "../types/PracticeSession";

type State = {
  rows: PracticeSession[];
  loading: boolean;
  load: () => Promise<void>;
  create: (lessonId: number, mode: string) => Promise<PracticeSession>;
  complete: (id: number) => Promise<void>;
};

export const usePracticeSessionStore = create<State>((set, get) => ({
  rows: [],
  loading: false,
  async load() {
    set({ loading: true });
    set({ rows: await listPracticeSession(), loading: false });
  },
  async create(lessonId, mode) {
    const session = await createPracticeSession(lessonId, mode);
    set({ rows: [...get().rows, session] });
    return session;
  },
  async complete(id) {
    const updated = await completePracticeSession(id);
    if (updated) {
      set({ rows: get().rows.map((r) => (r.id === id ? updated : r)) });
    }
  }
}));
