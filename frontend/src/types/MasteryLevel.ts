export const MasteryLevel = ["NEW","LEARNING","FAMILIAR","MASTERED"] as const;
export type MasteryLevel = (typeof MasteryLevel)[number];
export const MasteryLevelText: Record<MasteryLevel, string> = Object.fromEntries(MasteryLevel.map((value) => [value, value.replace(/_/g, " ")])) as Record<MasteryLevel, string>;
