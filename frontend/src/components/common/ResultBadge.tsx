import type { AnswerStatus } from "../../types/AnswerRecord";
import type { SessionStatus } from "../../types/PracticeSession";

/** 结算结果徽章：SETTLED 才算数，ROLLED_BACK 是崩溃后撤掉的残留 */
export function ResultBadge({ value }: { value: AnswerStatus | SessionStatus | "CORRECT" | "WRONG" }) {
  const text: Record<string, string> = {
    SETTLED: "已结算",
    PENDING: "待结算",
    ROLLED_BACK: "已撤掉",
    CORRECT: "答对",
    WRONG: "答错",
    RUNNING: "进行中",
    RECOVERED: "已恢复",
    FINISHED: "已完成",
    ABANDONED: "已失效"
  };
  return <span className={"badge result-" + String(value).toLowerCase().replace(/_/g, "-")}>{text[value] ?? value}</span>;
}
