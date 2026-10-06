/**
 * 状态徽章：同时服务 PracticeMode / SymbolCategory / MasteryLevel
 * 及账本状态（SessionStatus / AnswerStatus）。新增枚举值需同步这里的文案。
 */
const LABELS: Record<string, string> = {
  // PracticeMode
  CELL_TO_TEXT: "看点位写字符",
  TEXT_TO_CELL: "看字符点点位",
  LISTENING: "听音辨字符",
  MIXED: "混合练习",
  // SymbolCategory
  LETTER: "字母",
  NUMBER: "数字",
  PUNCTUATION: "标点",
  CONTRACTION: "缩略词",
  // MasteryLevel
  NEW: "未学",
  LEARNING: "学习中",
  FAMILIAR: "熟悉",
  MASTERED: "已掌握",
  // 账本/本地数据
  LOCAL_DATA: "本地账本"
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={"badge " + String(value).toLowerCase().replace(/_/g, "-")}>
      {LABELS[value] ?? String(value).replace(/_/g, " ")}
    </span>
  );
}
