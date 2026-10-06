export const SymbolCategory = ["LETTER", "NUMBER", "PUNCTUATION", "CONTRACTION"] as const;
export type SymbolCategory = (typeof SymbolCategory)[number];
export const SymbolCategories: readonly SymbolCategory[] = SymbolCategory;
export const SymbolCategoryText: Record<SymbolCategory, string> = {
  LETTER: "字母",
  NUMBER: "数字",
  PUNCTUATION: "标点",
  CONTRACTION: "缩略词"
};
