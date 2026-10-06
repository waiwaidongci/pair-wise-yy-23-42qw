import { create } from "zustand";
import { listLesson, saveLesson } from "../api/Lesson";
import type { Lesson } from "../types/Lesson";

type State = {
  rows: Lesson[];
  loading: boolean;
  load: () => Promise<void>;
  save: (lesson: Lesson) => Promise<Lesson>;
};

export const useLessonStore = create<State>((set, get) => ({
  rows: [],
  loading: false,
  async load() {
    set({ loading: true });
    set({ rows: await listLesson(), loading: false });
  },
  async save(lesson) {
    const saved = await saveLesson(lesson);
    const rows = get().rows.some((r) => r.id === saved.id)
      ? get().rows.map((r) => (r.id === saved.id ? saved : r))
      : [...get().rows, saved];
    set({ rows });
    return saved;
  }
}));
