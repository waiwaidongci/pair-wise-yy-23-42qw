import { useEffect, useState } from "react";
import { buildProgressStat, type ProgressStat } from "../services/StatisticsService";
import { usePracticeSessionStore } from "../stores/PracticeSessionStore";
import { ChartPanel } from "../components/common/ChartPanel";
import { StatCard } from "../components/common/StatCard";
import { ResultBadge } from "../components/common/ResultBadge";
import { EmptyState } from "../components/common/EmptyState";
import { PracticeModeText } from "../constants/PracticeMode";
import { MistakeReasonText } from "../services/grading";
import { formatDate } from "../utils/formatters";

/**
 * 学习进度：只消费 SETTLED 账本；聚合结果走可重建缓存，
 * 空间不足时缓存会被先清掉，账本数据不受影响。
 */
export function ProgressPage() {
  const practice = usePracticeSessionStore();
  const [stat, setStat] = useState<ProgressStat | null>(null);

  const refresh = async () => {
    setStat(await buildProgressStat());
  };

  useEffect(() => {
    void practice.load();
    void refresh();
  }, []);

  const reasonData = Object.entries(stat?.mistakeReasons ?? {}).map(([key, value]) => ({
    label: MistakeReasonText[key as keyof typeof MistakeReasonText] ?? key,
    value
  }));
  const difficultyData = Object.entries(stat?.difficultyDistribution ?? {}).map(([key, value]) => ({
    label: `难度 ${key}`,
    value
  }));

  return (
    <section className="page-body">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">braille-trainer / progress</p>
          <h1>学习进度</h1>
          <p className="subtitle">统计只认已结算记录；失效重排 {stat?.invalidatedQuestions ?? 0} 题，聚合为可重建缓存。</p>
        </div>
        <button className="chip" onClick={() => void refresh()}>刷新统计（读缓存/账本）</button>
      </div>

      <section className="metrics">
        <StatCard label="练习会话" value={stat?.totalSessions ?? "-"} />
        <StatCard label="完成场次" value={stat?.finishedSessions ?? "-"} />
        <StatCard label="已结算答题" value={stat?.totalAnswers ?? "-"} />
        <StatCard label="正确率" value={stat === null ? "-" : `${stat.accuracy}%`} />
        <StatCard label="失效重排题" value={stat?.invalidatedQuestions ?? "-"} />
      </section>

      <div className="charts-grid">
        <ChartPanel title="错误原因分布（冻结快照归类）" data={reasonData} />
        <ChartPanel title="难度分布" data={difficultyData} />
      </div>

      <h2 className="section-title">会话账本</h2>
      {practice.rows.length === 0 ? <EmptyState title="暂无会话" /> : (
        <div className="table panel">
          {practice.rows.map((s) => (
            <article className="row" key={s.id}>
              <strong>会话 #{s.id}</strong>
              <span>{PracticeModeText[s.mode]}</span>
              <ResultBadge value={s.status} />
              <span>得分 {s.score} · 错 {s.mistake_count} · 剩 {s.pending_symbol_ids.length}</span>
              <span className="muted">{formatDate(s.started_at)}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
