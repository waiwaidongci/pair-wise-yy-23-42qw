import { useEffect, useMemo, useRef, useState } from "react";
import { usePracticeSessionStore } from "../stores/PracticeSessionStore";
import { useLessonStore } from "../stores/LessonStore";
import { PracticePanel } from "../components/common/PracticePanel";
import { LessonProgress } from "../components/common/LessonProgress";
import { ResultBadge } from "../components/common/ResultBadge";
import { EmptyState } from "../components/common/EmptyState";
import { PracticeModes, PracticeModeText } from "../constants/PracticeMode";
import type { PracticeMode } from "../types/PracticeMode";
import type { AnswerRecord } from "../types/AnswerRecord";

/**
 * 练习页：
 * - 开练冻结课程/卡片快照（store.start -> startPracticeSession）
 * - 提交先记操作号再结算（service 内两阶段事务）
 * - 两个标签页并发同题：只结算一笔，后到页面保留输入现场并给出胜出提示
 * - 切回标签页/重新进入时对半截会话做失效重排
 */
export function PracticePage() {
  const practice = usePracticeSessionStore();
  const lessonStore = useLessonStore();
  const [lessonId, setLessonId] = useState<number>(1);
  const [mode, setMode] = useState<PracticeMode>(PracticeModes[0]);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<AnswerRecord | null>(null);
  const shownAtRef = useRef<number>(Date.now());

  useEffect(() => {
    void lessonStore.load();
    void practice.load();
    // 启动恢复：补齐或撤掉未结算记录
    void practice.recover();
  }, []);

  // 切回标签页时，如果半截会话还开着，先做一次失效重排
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && practice.activeSession && practice.activeSession.status !== "FINISHED") {
        void practice.reconcile(practice.activeSession.id);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [practice.activeSession?.id]);

  const session = practice.activeSession;
  const currentSnapshot = session && session.current_symbol_id !== null ? session.symbol_snapshots[session.current_symbol_id] : null;
  const totalQuestions = useMemo(() => {
    if (!session) return 0;
    return session.answered_count + session.pending_symbol_ids.length;
  }, [session]);

  useEffect(() => {
    shownAtRef.current = Date.now();
    setFeedback(null);
  }, [session?.current_symbol_id]);

  const submit = async () => {
    if (!session || session.current_symbol_id === null) return;
    const outcome = await practice.submit({
      sessionId: session.id,
      symbolId: session.current_symbol_id,
      questionIndex: session.answered_count,
      userAnswer: answer,
      latencyMs: Date.now() - shownAtRef.current
    });
    if (!outcome) return;
    if (outcome.status === "SETTLED" && outcome.answer) {
      setFeedback(outcome.answer);
      setAnswer("");
    }
    // DUPLICATE_REJECTED：不清空 answer —— 后到页面保留现场，由提示条引导
  };

  return (
    <section className="page-body">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">braille-trainer / practice</p>
          <h1>练习模式</h1>
          <p className="subtitle">开练冻结课程与卡片快照；提交先记操作号，崩溃重启后自动补齐或撤掉未结算记录。</p>
        </div>
        <span className="version-tag">标签页 {practice.tabId}</span>
      </div>

      {practice.recovery ? (
        <div className="alert warning">
          崩溃恢复完成：补齐 {practice.recovery.committed} 笔、撤掉 {practice.recovery.aborted} 笔未结算记录，
          恢复 {practice.recovery.recoveredSessions.length} 场半截会话。
        </div>
      ) : null}
      {practice.error ? <div className="alert error">{practice.error}</div> : null}
      {practice.duplicateWinner && practice.duplicateWinner.source_tab !== practice.tabId ? (
        <div className="alert warning">
          并发提交：另一标签页（{practice.duplicateWinner.source_tab}）已结算这道题，本页只保留现场、不重复结算。
          正确答案：{practice.duplicateWinner.expected_answer}。
          <button className="link-btn" onClick={() => { practice.clearNotice(); if (session) void practice.openSession(session.id); }}>
            同步到最新现场
          </button>
        </div>
      ) : practice.duplicateWinner ? (
        <div className="alert warning">
          本题已经结算过一笔，重复提交未再次入账；答案输入已保留在本页。
        </div>
      ) : null}
      {practice.lastInvalidated.length > 0 ? (
        <div className="alert warning">
          检测到课程/卡片改版：{practice.lastInvalidated.length} 道未完成题已失效并重排（
          {practice.lastInvalidated.map((i) => `${i.symbol_id}:${i.reason}`).join("，")}）。
          <button className="link-btn" onClick={() => practice.clearNotice()}>知道了</button>
        </div>
      ) : null}

      {!session ? (
        <div className="panel start-panel">
          <h2>开始一场新练习</h2>
          <div className="form-row">
            <label>课程
              <select value={lessonId} onChange={(e) => setLessonId(Number(e.target.value))}>
                {lessonStore.rows.map((l) => <option key={l.id} value={l.id}>{l.title}（v{l.version}）</option>)}
              </select>
            </label>
            <label>模式
              <select value={mode} onChange={(e) => setMode(e.target.value as PracticeMode)}>
                {PracticeModes.map((m) => <option key={m} value={m}>{PracticeModeText[m]}</option>)}
              </select>
            </label>
            <button className="chip primary big" disabled={lessonStore.rows.length === 0} onClick={() => void practice.start(lessonId, mode)}>
              开练（冻结快照）
            </button>
          </div>

          <h2 className="section-title">历史 / 半截会话</h2>
          {practice.rows.length === 0 ? <EmptyState title="还没有练习会话" hint="开练后，会话、操作号和答题记录都会进入可恢复账本。" /> : (
            <div className="table">
              {practice.rows.map((s) => (
                <article className="row" key={s.id}>
                  <strong>会话 #{s.id}</strong>
                  <span>课程 {s.lesson_id} · {PracticeModeText[s.mode]}</span>
                  <ResultBadge value={s.status} />
                  <span>{s.answered_count} 题已结算</span>
                  {(s.status === "RUNNING" || s.status === "RECOVERED") && s.pending_symbol_ids.length > 0 ? (
                    <button className="link-btn" onClick={() => void practice.openSession(s.id)}>继续（失效重排）</button>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="practice-layout">
          <div className="panel">
            <LessonProgress answered={session.answered_count} total={totalQuestions} mistakes={session.mistake_count} label={`会话 #${session.id} · ${PracticeModeText[session.mode]}`} />
            {currentSnapshot ? (
              <>
                <PracticePanel snapshot={currentSnapshot} mode={session.mode} index={session.answered_count} total={totalQuestions} />
                <div className="answer-row">
                  <input
                    value={answer}
                    placeholder={session.mode === "TEXT_TO_CELL" ? "输入点位，如 1,4" : "输入字符"}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
                  />
                  <button className="chip primary" onClick={() => void submit()}>提交（先记操作号）</button>
                </div>
                {feedback ? (
                  <div className={feedback.correct ? "alert ok" : "alert error"}>
                    {feedback.correct ? "答对了" : `答错：${feedback.mistake_reason}`}，正确答案 {feedback.expected_answer}，
                    用时 {feedback.latency_ms}ms <ResultBadge value={feedback.status} />
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState
                title={session.status === "ABANDONED" ? "题目全部失效" : "本场会话已结束"}
                hint={session.status === "ABANDONED" ? "课程或卡片改版后已无有效题目，会话终止；已结算记录与冻结快照保留。" : `得分 ${session.score}，错误 ${session.mistake_count}。`}
              />
            )}
            <button className="link-btn" onClick={() => usePracticeSessionStore.setState({ activeSession: null })}>退出本场</button>
          </div>
          <aside className="panel side-panel">
            <h2>会话账本</h2>
            <ul className="kv">
              <li><span>状态</span><ResultBadge value={session.status} /></li>
              <li><span>冻结课程</span>{session.lesson_snapshot?.title} v{session.lesson_snapshot?.version}</li>
              <li><span>快照卡片</span>{Object.keys(session.symbol_snapshots).length} 张</li>
              <li><span>剩余题目</span>{session.pending_symbol_ids.length}</li>
              <li><span>已结算</span>{session.answered_count} 笔</li>
            </ul>
          </aside>
        </div>
      )}
    </section>
  );
}
