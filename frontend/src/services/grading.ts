import type { SymbolSnapshot } from "../types/PracticeSession";

/** 错误原因归类，错题本按此分组；依据开练时冻结的卡片快照，老师改版不影响旧错因 */
export type MistakeReason = "CORRECT" | "WRONG_LETTER" | "DOT_MISSING" | "DOT_EXTRA" | "EMPTY_ANSWER" | "LATENESS";

/** 按练习模式给出本题的正确答案（来自冻结快照） */
export function expectedAnswerFor(snapshot: SymbolSnapshot, mode: string): string {
  switch (mode) {
    case "TEXT_TO_CELL":
      return normalizePattern(snapshot.cell_pattern);
    case "LISTENING":
    case "CELL_TO_TEXT":
    case "MIXED":
    default:
      return snapshot.letter.trim().toLowerCase();
  }
}

export function normalizePattern(pattern: string): string {
  return pattern
    .split(/[,\s，、]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => Number(p))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 6)
    .sort((a, b) => a - b)
    .join(",");
}

export function isAnswerCorrect(userAnswer: string, expected: string, mode: string): boolean {
  if (mode === "TEXT_TO_CELL") {
    return normalizePattern(userAnswer) === normalizePattern(expected);
  }
  return userAnswer.trim().toLowerCase() === expected.trim().toLowerCase();
}

/**
 * 判题并归类错误原因。点阵模式比对点位集合，文本模式直接比对。
 */
export function gradeAnswer(userAnswer: string, snapshot: SymbolSnapshot, mode: string): { correct: boolean; reason: MistakeReason } {
  const expected = expectedAnswerFor(snapshot, mode);
  const correct = isAnswerCorrect(userAnswer, expected, mode);
  if (correct) return { correct: true, reason: "CORRECT" };
  if (userAnswer.trim() === "") return { correct: false, reason: "EMPTY_ANSWER" };
  if (mode === "TEXT_TO_CELL") {
    const user = new Set(normalizePattern(userAnswer).split(",").filter(Boolean).map(Number));
    const want = new Set(normalizePattern(expected).split(",").filter(Boolean).map(Number));
    const missing = [...want].filter((d) => !user.has(d)).length;
    const extra = [...user].filter((d) => !want.has(d)).length;
    if (missing > 0 && extra === 0) return { correct: false, reason: "DOT_MISSING" };
    if (extra > 0 && missing === 0) return { correct: false, reason: "DOT_EXTRA" };
  }
  return { correct: false, reason: "WRONG_LETTER" };
}

export const MistakeReasonText: Record<MistakeReason, string> = {
  CORRECT: "答对",
  WRONG_LETTER: "字符认错",
  DOT_MISSING: "漏点",
  DOT_EXTRA: "多点",
  EMPTY_ANSWER: "未作答",
  LATENESS: "超时"
};
