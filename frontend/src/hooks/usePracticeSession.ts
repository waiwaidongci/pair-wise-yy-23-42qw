import { useMemo } from "react";
import type { PracticeSession } from "../types/PracticeSession";
import type { AnswerRecord } from "../types/AnswerRecord";

/**
 * 从会话与已结算答题记录派生练习视图：当前题号、进度、剩余题、是否可继续。
 * 只统计 SETTLED 记录，PENDING/ROLLED_BACK 不参与进度。
 */
export function usePracticeSession(session: PracticeSession | null, answers: AnswerRecord[]) {
  return useMemo(() => {
    if (!session) {
      return { active: false, index: 0, total: 0, settled: 0, remaining: 0, canContinue: false, finished: false };
    }
    const settled = answers.filter((a) => a.session_id === session.id && a.status === "SETTLED");
    const total = session.answered_count + session.pending_symbol_ids.length;
    return {
      active: session.status === "RUNNING" || session.status === "RECOVERED",
      index: session.answered_count,
      total,
      settled: settled.length,
      remaining: session.pending_symbol_ids.length,
      canContinue: (session.status === "RUNNING" || session.status === "RECOVERED") && session.pending_symbol_ids.length > 0,
      finished: session.status === "FINISHED",
      abandoned: session.status === "ABANDONED"
    };
  }, [session, answers]);
}
