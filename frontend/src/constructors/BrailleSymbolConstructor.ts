import type { BrailleSymbol } from "../types/BrailleSymbol";

export const createDefaultBrailleSymbol = (overrides: Partial<BrailleSymbol> = {}): BrailleSymbol => ({
  id: 1 as never,
  cell_pattern: "cell pattern 1" as never,
  letter: "letter 1" as never,
  pinyin: "pinyin 1" as never,
  category: "TEXT_TO_CELL" as never,
  difficulty: "difficulty 1" as never,
  audio_hint_key: "audio hint key 1" as never,
  ...overrides
});

export const createBrailleSymbolForm = createDefaultBrailleSymbol;
export const createBrailleSymbolResponse = createDefaultBrailleSymbol;
