import { getAll, getById, openLedgerDb, putOne, STORE, withCacheEvictionOnQuota } from "../db/ledgerDb";
import { nextId } from "../db/ledgerInit";
import { createDefaultLesson } from "../constructors/LessonConstructor";
import type { Lesson } from "../types/Lesson";
import { log } from "../utils/logger";
import { wrapServiceError } from "./LedgerError";

export async function listLessons(): Promise<Lesson[]> {
  const db = await openLedgerDb();
  const rows = await getAll<Lesson>(db, STORE.lessons);
  return rows.sort((a, b) => a.id - b.id);
}

export async function getLesson(id: number): Promise<Lesson | undefined> {
  const db = await openLedgerDb();
  return getById<Lesson>(db, STORE.lessons, id);
}

/**
 * 老师保存课程：标题/题目组成等内容变化时版本 +1，
 * 进行中的会话据此把旧课程快照判为失效。
 */
export async function saveLesson(input: Partial<Lesson> & Pick<Lesson, "title">): Promise<Lesson> {
  try {
    const db = await openLedgerDb();
    const existing = input.id ? await getById<Lesson>(db, STORE.lessons, input.id) : undefined;
    const now = new Date().toISOString();
    const base = existing ?? createDefaultLesson({ id: await nextId(STORE.lessons), updated_at: now });
    const candidate: Lesson = { ...base, ...input, id: base.id, symbol_ids: [...(input.symbol_ids ?? base.symbol_ids)] };
    const contentChanged = existing
      ? existing.title !== candidate.title ||
        existing.stage !== candidate.stage ||
        existing.symbol_ids.length !== candidate.symbol_ids.length ||
        existing.symbol_ids.some((id, idx) => id !== candidate.symbol_ids[idx]) ||
        existing.estimated_minutes !== candidate.estimated_minutes ||
        existing.unlock_rule !== candidate.unlock_rule
      : true;
    const saved: Lesson = {
      ...candidate,
      version: existing && contentChanged ? existing.version + 1 : base.version,
      updated_at: contentChanged ? now : base.updated_at
    };
    await withCacheEvictionOnQuota(db, [STORE.lessons], async (d) => {
      await putOne(d, STORE.lessons, saved);
    });
    log("Lesson", existing ? (contentChanged ? 1 : 2) : 0, {
      id: saved.id,
      title: saved.title,
      version: saved.version,
      oldVersion: existing?.version ?? 0,
      symbolIds: saved.symbol_ids.join(","),
      stage: saved.stage
    });
    return saved;
  } catch (error) {
    throw wrapServiceError(error);
  }
}
