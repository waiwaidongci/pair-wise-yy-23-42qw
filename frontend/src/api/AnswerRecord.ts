import type { AnswerRecord } from "../types/AnswerRecord";
import { listAnswerRecords, listInvalidatedQuestions, listOpLogs } from "../services/PracticeLedgerService";
import { wrapControllerError } from "../services/LedgerError";
import { log } from "../utils/logger";
import type { AnswerOpLog } from "../types/AnswerOpLog";
import type { InvalidatedQuestion } from "../types/InvalidatedQuestion";

const endpoint = "/api/answer-record";

export async function listAnswerRecord(): Promise<AnswerRecord[]> {
  void endpoint;
  try {
    return await listAnswerRecords();
  } catch (error) {
    throw wrapControllerError(error, "加载答题记录");
  }
}

export async function listAnswerRecordBySession(sessionId: number): Promise<AnswerRecord[]> {
  try {
    return await listAnswerRecords({ sessionId, settledOnly: true });
  } catch (error) {
    throw wrapControllerError(error, "加载本场答题");
  }
}

export async function listInvalidatedQuestionApi(sessionId?: number): Promise<InvalidatedQuestion[]> {
  return listInvalidatedQuestions(sessionId);
}

export async function listOpLogApi(sessionId?: number): Promise<AnswerOpLog[]> {
  return listOpLogs(sessionId);
}

export async function exportAnswerRecord(): Promise<AnswerRecord[]> {
  const rows = await listAnswerRecords({ settledOnly: true });
  log("AnswerRecord", 4, { count: rows.length });
  return rows;
}
