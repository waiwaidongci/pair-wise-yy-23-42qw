import { useEffect, useState, useCallback, useRef } from "react";
import { useLedgerStore } from "../stores/LedgerStore";
import { usePracticeSessionStore } from "../stores/PracticeSessionStore";
import { useAnswerRecordStore } from "../stores/AnswerRecordStore";
import { getSessionSnapshot } from "../api/SessionSnapshot";
import type { SessionSnapshot } from "../types/SessionSnapshot";
import type { PracticeSession } from "../types/PracticeSession";
import type { AnswerRecord } from "../types/AnswerRecord";
import { useLedgerRecovery } from "./useLedgerRecovery";

export interface RecoverableSessionState {
  session: PracticeSession | null;
  snapshot: SessionSnapshot | null;
  records: AnswerRecord[];
  currentIndex: number;
  currentSymbolId: number | null;
  loading: boolean;
  submitting: boolean;
  lockHeldByOther: boolean;
  lastAnswerCorrect: boolean | null;
  start: (lessonId: number, mode: string) => Promise<void>;
  resume: (session: PracticeSession) => Promise<void>;
  submitAnswer: (symbolId: number, answer: string) => Promise<void>;
  next: () => void;
  finish: () => Promise<void>;
}

/**
 * 可恢复练习会话 hook：
 * - 开练冻结课程与卡片快照
 * - 答题先记操作号，再在锁保护下结算
 * - 重启后自动恢复未结算记录
 * - 两标签页并发时只结算一笔，后到页面保留现场
 */
export function useRecoverableSession(): RecoverableSessionState {
  const { submit, lastSubmit } = useLedgerStore();
  const { create, complete } = usePracticeSessionStore();
  const { rows: records, loadBySession } = useAnswerRecordStore();
  const { recovering } = useLedgerRecovery();

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lockHeldByOther, setLockHeldByOther] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const sceneRef = useRef<{ symbolId: number; answer: string } | null>(null);

  const currentSymbolId = snapshot?.question_order[currentIndex] ?? null;

  const start = useCallback(
    async (lessonId: number, mode: string) => {
      setLoading(true);
      try {
        const s = await create(lessonId, mode);
        const snap = await getSessionSnapshot(s.id);
        setSession(s);
        setSnapshot(snap ?? null);
        setCurrentIndex(0);
        setLockHeldByOther(false);
        setLastAnswerCorrect(null);
        sceneRef.current = null;
      } finally {
        setLoading(false);
      }
    },
    [create]
  );

  const resume = useCallback(
    async (existing: PracticeSession) => {
      setLoading(true);
      try {
        const snap = await getSessionSnapshot(existing.id);
        setSession(existing);
        setSnapshot(snap ?? null);
        // 定位到第一道未答题
        const answeredCount = existing.answered_count;
        setCurrentIndex(answeredCount);
        setLockHeldByOther(false);
        setLastAnswerCorrect(null);
        sceneRef.current = null;
        await loadBySession(existing.id);
      } finally {
        setLoading(false);
      }
    },
    [loadBySession]
  );

  const submitAnswer = useCallback(
    async (symbolId: number, answer: string) => {
      if (!session || !snapshot) return;
      setSubmitting(true);
      setLockHeldByOther(false);
      // 保留现场：记录当前作答，即使结算失败也不丢失
      sceneRef.current = { symbolId, answer };
      try {
        const result = await submit(session.id, symbolId, answer);
        if (result.settled && result.record) {
          setLastAnswerCorrect(result.record.correct === "true");
          sceneRef.current = null;
          await loadBySession(session.id);
        } else {
          // 锁被抢占：保留现场，提示另一标签页正在结算
          setLockHeldByOther(true);
          setLastAnswerCorrect(null);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [session, snapshot, submit, loadBySession]
  );

  const next = useCallback(() => {
    setCurrentIndex((i) => {
      if (!snapshot) return i;
      return Math.min(i + 1, snapshot.question_order.length);
    });
    setLastAnswerCorrect(null);
    setLockHeldByOther(false);
  }, [snapshot]);

  const finish = useCallback(async () => {
    if (!session) return;
    await complete(session.id);
    setSession(null);
    setSnapshot(null);
    setCurrentIndex(0);
  }, [session, complete]);

  // 恢复完成后刷新会话数据
  useEffect(() => {
    if (recovering || !session) return;
    void loadBySession(session.id);
  }, [recovering, session, loadBySession]);

  return {
    session,
    snapshot,
    records,
    currentIndex,
    currentSymbolId,
    loading: loading || recovering,
    submitting,
    lockHeldByOther,
    lastAnswerCorrect,
    start,
    resume,
    submitAnswer,
    next,
    finish
  };
}
