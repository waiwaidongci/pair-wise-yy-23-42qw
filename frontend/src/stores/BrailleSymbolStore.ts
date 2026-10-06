import { create } from "zustand";
import { listBrailleSymbol, saveBrailleSymbol } from "../api/BrailleSymbol";
import type { BrailleSymbol } from "../types/BrailleSymbol";

type State = {
  rows: BrailleSymbol[];
  loading: boolean;
  load: () => Promise<void>;
  save: (symbol: BrailleSymbol) => Promise<BrailleSymbol>;
};

export const useBrailleSymbolStore = create<State>((set, get) => ({
  rows: [],
  loading: false,
  async load() {
    set({ loading: true });
    set({ rows: await listBrailleSymbol(), loading: false });
  },
  async save(symbol) {
    const saved = await saveBrailleSymbol(symbol);
    const rows = get().rows.some((r) => r.id === saved.id)
      ? get().rows.map((r) => (r.id === saved.id ? saved : r))
      : [...get().rows, saved];
    set({ rows });
    return saved;
  }
}));
