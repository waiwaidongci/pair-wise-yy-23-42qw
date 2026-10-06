import { create } from "zustand";
import { listBrailleSymbol } from "../api/BrailleSymbol";
import type { BrailleSymbol } from "../types/BrailleSymbol";

type State = { rows: BrailleSymbol[]; loading: boolean; load: () => Promise<void> };

export const useBrailleSymbolStore = create<State>((set) => ({
  rows: [],
  loading: false,
  async load() {
    set({ loading: true });
    set({ rows: await listBrailleSymbol(), loading: false });
  }
}));
