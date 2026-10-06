import { create } from "zustand";
import { listLesson } from "../api/Lesson";
import type { Lesson } from "../types/Lesson";

type State = { rows: Lesson[]; loading: boolean; load: () => Promise<void> };

export const useLessonStore = create<State>((set) => ({
  rows: [],
  loading: false,
  async load() {
    set({ loading: true });
    set({ rows: await listLesson(), loading: false });
  }
}));
