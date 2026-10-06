export const MasteryLevel = ["NEW", "LEARNING", "FAMILIAR", "MASTERED"] as const;
export type MasteryLevel = (typeof MasteryLevel)[number];
export const MasteryLevels: readonly MasteryLevel[] = MasteryLevel;
export const MasteryLevelText: Record<MasteryLevel, string> = {
  NEW: "未学",
  LEARNING: "学习中",
  FAMILIAR: "熟悉",
  MASTERED: "已掌握"
};
