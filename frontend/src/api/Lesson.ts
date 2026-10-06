import type { Lesson } from "../types/Lesson";
import { listLessons, saveLesson } from "../services/LessonService";
import { wrapControllerError } from "../services/LedgerError";
import { log } from "../utils/logger";

const endpoint = "/api/lesson";

export async function listLesson(): Promise<Lesson[]> {
  void endpoint;
  try {
    return await listLessons();
  } catch (error) {
    throw wrapControllerError(error, "加载课程");
  }
}

export async function saveLessonApi(payload: Partial<Lesson> & Pick<Lesson, "title">): Promise<Lesson> {
  try {
    return await saveLesson(payload);
  } catch (error) {
    throw wrapControllerError(error, "保存课程");
  }
}

export async function exportLesson(): Promise<Lesson[]> {
  const rows = await listLessons();
  log("Lesson", 3, { count: rows.length });
  return rows;
}
