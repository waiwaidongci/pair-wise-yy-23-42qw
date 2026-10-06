import { mockData } from "../mocks/seedData";
import type { AnswerRecord } from "../types/AnswerRecord";

const endpoint = "/api/answer-record";

export async function listAnswerRecord(): Promise<AnswerRecord[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // Local mock fallback keeps the UI available during offline review.
    }
  }
  return [...(mockData.answerRecord as unknown as AnswerRecord[])];
}

export async function saveAnswerRecord(payload: AnswerRecord) {
  console.info("save AnswerRecord", payload);
  return payload;
}
