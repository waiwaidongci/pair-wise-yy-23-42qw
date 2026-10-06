import { create } from "zustand";
import { listBrailleSymbol, saveBrailleSymbolApi } from "../api/BrailleSymbol";
import type { BrailleSymbol } from "../types/BrailleSymbol";
import { isLedgerError } from "../services/LedgerError";

type State = {
  rows: BrailleSymbol[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  save: (payload: Partial<BrailleSymbol> & Pick<BrailleSymbol, "letter" | "cell_pattern">) => Promise<BrailleSymbol | null>;
  clearError: () => void;
};

export const useBrailleSymbolStore = create<State>((set, get) => ({
  rows: [],
  loading: false,
  error: null,
  async load() {
    set({ loading: true, error: null });
    try {
      set({ rows: await listBrailleSymbol(), loading: false });
    } catch (error) {
      set({ loading: false, error: isLedgerError(error) ? error.message : String(error) });
    }
  },
  async save(payload) {
    try {
      const saved = await saveBrailleSymbolApi(payload);
      // 老师改卡片后刷新本地行；进行中的会话在练习页提交/进入时做失效重排
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
