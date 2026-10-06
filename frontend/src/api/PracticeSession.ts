import { STORES, getAll, getByKey, put, add } from "../utils/ledgerDb";
import type { PracticeSession } from "../types/PracticeSession";
import { createDefaultPracticeSession } from "../constructors/PracticeSessionConstructor";
import { freezeSessionSnapshot } from "./SessionSnapshot";
import { logWrite } from "../utils/logger";

export async function listPracticeSession(): Promise<PracticeSession[]> {
  return getAll<PracticeSession>(STORES.SESSIONS);
}

export async function getPracticeSession(id: number): Promise<PracticeSession | undefined> {
  return getByKey<PracticeSession>(STORES.SESSIONS, id);
}

/**
 * 创建练习会话：开练时冻结课程与卡片快照。
 */
export async function createPracticeSession(
  lessonId: number,
  mode: string
): Promise<PracticeSession> {
  const session = createDefaultPracticeSession({
    lesson_id: lessonId,
    mode,
    started_at: new Date().toISOString(),
    status: "active"
  });
  const { id: _id, ...sessionData } = session;
  const id = await add(STORES.SESSIONS, sessionData);
  session.id = id as number;

  // 冻结快照
  const snapshot = await freezeSessionSnapshot(session.id, lessonId);
  if (snapshot) {
    session.snapshot_id = snapshot.session_id;
    session.version_hash = snapshot.version_hash;
    session.total_questions = snapshot.question_order.length;
    await put(STORES.SESSIONS, session);
  }

  logWrite("PracticeSession", 0, { session_id: session.id, lesson_id: lessonId });
  return session;
}

export async function savePracticeSession(payload: PracticeSession): Promise<PracticeSession> {
  await put(STORES.SESSIONS, payload);
  logWrite("PracticeSession", 1, { session_id: payload.id });
  return payload;
}

/**
 * 完成会话：标记为已完成。
 */
export async function completePracticeSession(id: number): Promise<PracticeSession | undefined> {
  const session = await getByKey<PracticeSession>(STORES.SESSIONS, id);
  if (!session) return undefined;
  session.status = "completed";
  session.finished_at = new Date().toISOString();
  await put(STORES.SESSIONS, session);
  logWrite("PracticeSession", 2, { session_id: id });
  return session;
}
