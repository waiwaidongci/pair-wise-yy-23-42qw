import { create } from "zustand";
import { listLesson, saveLessonApi } from "../api/Lesson";
import type { Lesson } from "../types/Lesson";
import { isLedgerError } from "../services/LedgerError";

type State = {
  rows: Lesson[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  save: (payload: Partial<Lesson> & Pick<Lesson, "title">) => Promise<Lesson | null>;
  clearError: () => void;
};

export const useLessonStore = create<State>((set, get) => ({
  rows: [],
  loading: false,
  error: null,
  async load() {
    set({ loading: true, error: null });
    try {
      set({ rows: await listLesson(), loading: false });
    } catch (error) {
      set({ loading: false, error: isLedgerError(error) ? error.message : String(error) });
    }
  },
  async save(payload) {
    try {
      const saved = await saveLessonApi(payload);
      // 老师改课程后版本递增；进行中的会话提交前/进入时据此失效重排
      set({ rows: [...get().rows.filter((r) => r.id !== saved.id), saved].sort((a, b) => a.id - b.id), error: null });
      return saved;
    } catch (error) {
      set({ error: isLedgerError(error) ? error.message : String(error) });
      return null;
    }
  },
  clearError() {
    set({ error: null });
  }
}));
