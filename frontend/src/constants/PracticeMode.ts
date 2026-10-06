/**
 * PracticeMode 枚举（常量定义处）。
 * 同名类型在 types/PracticeMode.ts 重复声明，新增枚举值需同步：
 * constants / types / logTemplates / errorMessages / 筛选器 / 展示组件。
 */
export const PracticeMode = ["CELL_TO_TEXT", "TEXT_TO_CELL", "LISTENING", "MIXED"] as const;
export type PracticeMode = (typeof PracticeMode)[number];
/** 复数别名，供需要以“值列表”引用的模块使用，避免与类型名冲突 */
export const PracticeModes: readonly PracticeMode[] = PracticeMode;
export const PracticeModeText: Record<PracticeMode, string> = {
  CELL_TO_TEXT: "看点位写字符",
  TEXT_TO_CELL: "看字符点点位",
  LISTENING: "听音辨字符",
  MIXED: "混合练习"
};
