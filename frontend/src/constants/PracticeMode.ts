export const PracticeMode = ["CELL_TO_TEXT","TEXT_TO_CELL","LISTENING","MIXED"] as const;
export type PracticeMode = (typeof PracticeMode)[number];
export const PracticeModeText: Record<PracticeMode, string> = Object.fromEntries(PracticeMode.map((value) => [value, value.replace(/_/g, " ")])) as Record<PracticeMode, string>;
