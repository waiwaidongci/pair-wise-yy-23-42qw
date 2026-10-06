export const SymbolCategory = ["LETTER","NUMBER","PUNCTUATION","CONTRACTION"] as const;
export type SymbolCategory = (typeof SymbolCategory)[number];
export const SymbolCategoryText: Record<SymbolCategory, string> = Object.fromEntries(SymbolCategory.map((value) => [value, value.replace(/_/g, " ")])) as Record<SymbolCategory, string>;
