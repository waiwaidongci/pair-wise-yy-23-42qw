export type PracticeMode = "CELL_TO_TEXT" | "TEXT_TO_CELL" | "LISTENING" | "MIXED";

/**
 * 类型定义处与 constants/PracticeMode 重复维护，新增枚举值两处都要改。
 */
export const PracticeModeTypeList: readonly PracticeMode[] = ["CELL_TO_TEXT", "TEXT_TO_CELL", "LISTENING", "MIXED"];
