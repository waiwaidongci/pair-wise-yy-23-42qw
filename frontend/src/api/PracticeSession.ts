import type { PracticeSession } from "../types/PracticeSession";
import {
  listPracticeSessions,
  recoverLedger,
  reconcileSession,
  startPracticeSession,
  submitAnswer as submitAnswerService,
  type StartSessionInput,
  type SubmitAnswerInput,
  type SubmitOutcome
} from "../services/PracticeLedgerService";
import { wrapControllerError } from "../services/LedgerError";

const endpoint = "/api/practice-session";

export async function listPracticeSession(): Promise<PracticeSession[]> {
  void endpoint;
  try {
    return await listPracticeSessions();
  } catch (error) {
    throw wrapControllerError(error, "加载练习会话");
  }
}

/** 开练：冻结课程与卡片快照 */
export async function startPracticeSessionApi(input: StartSessionInput): Promise<PracticeSession> {
  try {
    return await startPracticeSession(input);
  } catch (error) {
    throw wrapControllerError(error, "开始练习");
  }
}

/** 答题两阶段提交，返回结算结果（含并发只结算一笔的判定） */
export async function submitAnswerApi(input: SubmitAnswerInput): Promise<SubmitOutcome> {
  try {
    return await submitAnswerService(input);
  } catch (error) {
    throw wrapControllerError(error, "提交答案");
  }
}

/** 课程/卡片变化后，未完成题目失效重排 */
export async function reconcileSessionApi(sessionId: number) {
  try {
    return await reconcileSession(sessionId);
  } catch (error) {
    throw wrapControllerError(error, "失效重排");
  }
}

/** 应用启动：补齐或撤掉未结算记录，恢复半截会话 */
export async function recoverLedgerApi() {
  try {
    return await recoverLedger();
  } catch (error) {
    throw wrapControllerError(error, "崩溃恢复");
  }
}
