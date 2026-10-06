import { STORES, getAll, getByIndex, add } from "../utils/ledgerDb";
import type { AnswerRecord } from "../types/AnswerRecord";
import { logWrite } from "../utils/logger";

export async function listAnswerRecord(): Promise<AnswerRecord[]> {
  return getAll<AnswerRecord>(STORES.ANSWER_RECORDS);
}

export async function listAnswerRecordBySession(sessionId: number): Promise<AnswerRecord[]> {
  return getByIndex<AnswerRecord>(STORES.ANSWER_RECORDS, "session_id", sessionId);
}

export async function listAnswerRecordBySymbol(symbolId: number): Promise<AnswerRecord[]> {
  return getByIndex<AnswerRecord>(STORES.ANSWER_RECORDS, "symbol_id", symbolId);
}

export async function saveAnswerRecord(payload: AnswerRecord): Promise<AnswerRecord> {
  await add(STORES.ANSWER_RECORDS, payload);
  logWrite("AnswerRecord", 0, { session_id: payload.session_id, op_id: payload.op_id });
  return payload;
}
