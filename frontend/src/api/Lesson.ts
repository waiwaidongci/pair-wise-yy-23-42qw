import { mockData } from "../mocks/seedData";
import type { Lesson } from "../types/Lesson";

const endpoint = "/api/lesson";

export async function listLesson(): Promise<Lesson[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // Local mock fallback keeps the UI available during offline review.
    }
  }
  return [...(mockData.lesson as unknown as Lesson[])];
}

export async function saveLesson(payload: Lesson) {
  console.info("save Lesson", payload);
  return payload;
}
