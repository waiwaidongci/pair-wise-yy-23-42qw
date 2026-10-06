import { useEffect, useMemo } from "react";
import { usePracticeSessionStore } from "../stores/PracticeSessionStore";
import { useAnswerRecordStore } from "../stores/AnswerRecordStore";
import { useLedgerStore } from "../stores/LedgerStore";
import { LessonProgress } from "../components/common/LessonProgress";
import { ChartPanel } from "../components/common/ChartPanel";
import { StatCard } from "../components/common/StatCard";
import { StatusBadge } from "../components/common/StatusBadge";
import { LedgerStatusBadge } from "../components/common/LedgerStatusBadge";

export function ProgressPage() {
  const { rows: sessions, load: loadSessions } = usePracticeSessionStore();
  const { rows: records, load: loadRecords } = useAnswerRecordStore();
  const { pending, settled, loadPending, loadSettled } = useLedgerStore();

  useEffect(() => {
    void loadSessions();
    void loadRecords();
    void loadPending();
    void loadSettled();
  }, [loadSessions, loadRecords, loadPending, loadSettled]);

  const stats = useMemo(() => {
    const total = records.length;
    const correct = records.filter((r) => r.correct === "true").length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const avgScore = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length)
      : 0;
    return { total, correct, accuracy, avgScore, sessionCount: sessions.length };
  }, [records, sessions]);

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">braille-trainer</p>
          <h1>学习进度</h1>
        </div>
        <StatusBadge value={`${stats.accuracy}% 正确率`} />
      </div>

      <div className="metrics">
        <StatCard label="练习会话" value={stats.sessionCount} />
        <StatCard label="答题总数" value={stats.total} />
        <StatCard label="平均得分" value={stats.avgScore} />
      </div>

      <div className="workbench">
        <div className="panel wide">
          <h2>正确率趋势</h2>
          <ChartPanel title="正确率" value={`${stats.accuracy}%`} />
          <LessonProgress title="累计正确" value={`${stats.correct} / ${stats.total}`} />
        </div>
        <div className="panel">
          <h2>账本状态</h2>
          <div className="ledger-stats">
            <div className="ledger-row">
              <LedgerStatusBadge status="pending" />
              <span>{pending.length} 笔待结算</span>
            </div>
            <div className="ledger-row">
              <LedgerStatusBadge status="settled" />
              <span>{settled.length} 笔已结算</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
