import { createPracticeSession, completePracticeSession } from "../api/PracticeSession";
import { submitAnswer } from "../api/Ledger";
import { getSessionSnapshot } from "../api/SessionSnapshot";
import { recoverActiveSessions } from "../services/RecoveryService";
import type { PracticeSession } from "../types/PracticeSession";
import type { SessionSnapshot } from "../types/SessionSnapshot";
import type { AnswerRecord } from "../types/AnswerRecord";
import { logWrite } from "../utils/logger";

/**
 * 练习控制器：编排开练、答题、结算、完成的完整流程。
 * controller 层负责串联 service 与 api，并包装异常。
 */
export class PracticeController {
  /**
   * 开练：冻结课程与卡片快照。
   */
  async start(lessonId: number, mode: string): Promise<{ session: PracticeSession; snapshot: SessionSnapshot | null }> {
    try {
      const session = await createPracticeSession(lessonId, mode);
      const snapshot = await getSessionSnapshot(session.id);
      logWrite("PracticeSession", 0, { session_id: session.id });
      return { session, snapshot: snapshot ?? null };
    } catch (err) {
      logWrite("PracticeSession", 2, { error: String(err) });
      throw err;
    }
  }

  /**
   * 提交答案：先记操作号，再在锁保护下结算。
   * 若锁被其他标签页持有，返回 settled=false，由调用方保留现场。
   */
  async submit(
    sessionId: number,
    symbolId: number,
    userAnswer: string
  ): Promise<{ settled: boolean; record: AnswerRecord | null; reason: string | null }> {
    try {
      const result = await submitAnswer(sessionId, symbolId, userAnswer);
      return { settled: result.settled, record: result.record, reason: result.reason };
    } catch (err) {
      logWrite("LedgerEntry", 2, { error: String(err) });
      throw err;
    }
  }

  /**
   * 完成会话。
   */
  async finish(sessionId: number): Promise<PracticeSession | undefined> {
    try {
      return await completePracticeSession(sessionId);
    } catch (err) {
      logWrite("PracticeSession", 2, { error: String(err) });
      throw err;
    }
  }

  /**
   * 崩溃恢复：补齐或撤掉未结算记录。
   */
  async recover(): Promise<ReturnType<typeof recoverActiveSessions>> {
    try {
      return await recoverActiveSessions();
    } catch (err) {
      logWrite("Recovery", 2, { error: String(err) });
      throw err;
    }
  }
}

export const practiceController = new PracticeController();
