import { useEffect, useState, useMemo } from "react";
import { useRecoverableSession } from "../hooks/useRecoverableSession";
import { useLedgerRecovery } from "../hooks/useLedgerRecovery";
import { useLessonStore } from "../stores/LessonStore";
import { useBrailleSymbolStore } from "../stores/BrailleSymbolStore";
import { BrailleCell } from "../components/common/BrailleCell";
import { PracticePanel } from "../components/common/PracticePanel";
import { ResultBadge } from "../components/common/ResultBadge";
import { RecoveryBanner } from "../components/common/RecoveryBanner";
import { LockHeldNotice } from "../components/common/LockHeldNotice";
import { SnapshotDiff } from "../components/common/SnapshotDiff";
import { PracticeMode } from "../constants/PracticeMode";
import type { BrailleSymbol } from "../types/BrailleSymbol";

export function PracticePage() {
  const { results } = useLedgerRecovery();
  const { rows: lessons, load: loadLessons } = useLessonStore();
  const { rows: symbols, load: loadSymbols } = useBrailleSymbolStore();
  const {
    session,
    snapshot,
    records,
    currentIndex,
    currentSymbolId,
    loading,
    submitting,
    lockHeldByOther,
    lastAnswerCorrect,
    start,
    submitAnswer,
    next,
    finish
  } = useRecoverableSession();

  const [selectedLesson, setSelectedLesson] = useState<number>(0);
  const [mode, setMode] = useState<string>(PracticeMode[0]);
  const [answer, setAnswer] = useState("");
  const [stale, setStale] = useState(false);

  useEffect(() => {
    void loadLessons();
    void loadSymbols();
  }, [loadLessons, loadSymbols]);

  useEffect(() => {
    if (lessons.length > 0 && selectedLesson === 0) {
      setSelectedLesson(lessons[0].id);
    }
  }, [lessons, selectedLesson]);

  const symbolMap = useMemo(() => {
    const m = new Map<number, BrailleSymbol>();
    symbols.forEach((s) => m.set(s.id, s));
    return m;
  }, [symbols]);

  const currentSymbol = currentSymbolId ? symbolMap.get(currentSymbolId) : null;
  const totalQuestions = snapshot?.question_order.length ?? 0;
  const settledCount = records.length;
  const lastResult = results[results.length - 1];

  const handleStart = () => {
    if (selectedLesson > 0) {
      void start(selectedLesson, mode);
      setStale(false);
    }
  };

  const handleSubmit = () => {
    if (!currentSymbol) return;
    void submitAnswer(currentSymbol.id, answer);
    setAnswer("");
  };

  const handleNext = () => {
    next();
  };

  const handleFinish = () => {
    void finish();
  };

  if (!session) {
    return (
      <section className="page">
        <div className="page-head">
          <div>
            <p className="eyebrow">braille-trainer</p>
            <h1>练习模式</h1>
          </div>
        </div>
        <RecoveryBanner
          recovering={loading}
          settled={lastResult?.settled ?? 0}
          revoked={lastResult?.revoked ?? 0}
          rearranged={lastResult?.rearranged ?? false}
        />
        <div className="panel">
          <h2>开练设置</h2>
          <div className="form-row">
            <label>课程</label>
            <select value={selectedLesson} onChange={(e) => setSelectedLesson(Number(e.target.value))}>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>模式</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {PracticeMode.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <button className="primary" onClick={handleStart} disabled={loading || selectedLesson === 0}>
            {loading ? "准备中…" : "开练（冻结快照）"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">braille-trainer</p>
          <h1>练习模式</h1>
        </div>
        <ResultBadge value={`${settledCount}/${totalQuestions}`} />
      </div>

      <SnapshotDiff stale={stale} rearranged={lastResult?.rearranged ?? false} />
      <LockHeldNotice visible={lockHeldByOther} />

      <div className="metrics">
        <div className="stat"><span>已答</span><strong>{session.answered_count}</strong></div>
        <div className="stat"><span>正确</span><strong>{session.score}</strong></div>
        <div className="stat"><span>错误</span><strong>{session.mistake_count}</strong></div>
      </div>

      <div className="workbench">
        <div className="panel wide">
          <h2>第 {currentIndex + 1} / {totalQuestions} 题</h2>
          {currentSymbol ? (
            <>
              <BrailleCell title={currentSymbol.letter} value={currentSymbol.cell_pattern} />
              <PracticePanel
                title="输入对应字符"
                value={answer}
              />
              <div className="form-row">
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="输入答案"
                  disabled={submitting}
                />
              </div>
              <div className="btn-row">
                <button className="primary" onClick={handleSubmit} disabled={submitting || !answer}>
                  {submitting ? "结算中…" : "提交（先记操作号）"}
                </button>
                <button onClick={handleNext} disabled={submitting || currentIndex >= totalQuestions - 1}>
                  下一题
                </button>
                <button onClick={handleFinish}>结束练习</button>
              </div>
              {lastAnswerCorrect !== null && (
                <ResultBadge value={lastAnswerCorrect ? "正确" : "错误"} />
              )}
            </>
          ) : (
            <div className="empty">题目已全部作答完成</div>
          )}
        </div>
        <div className="panel">
          <h2>账本状态</h2>
          <p>会话 ID：{session.id}</p>
          <p>快照版本：{session.version_hash.slice(0, 12)}…</p>
          <p>已结算记录：{records.length}</p>
          <p>状态：{session.status}</p>
        </div>
      </div>
    </section>
  );
}
