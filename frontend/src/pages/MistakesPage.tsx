import { useEffect, useMemo, useState } from "react";
import { useAnswerRecordStore } from "../stores/AnswerRecordStore";
import { BrailleCell } from "../components/common/BrailleCell";
import { ResultBadge } from "../components/common/ResultBadge";
import { EmptyState } from "../components/common/EmptyState";
import { MistakeReasonText, type MistakeReason } from "../services/grading";

/**
 * 错题本：
 * - 只取 SETTLED 且答错的记录；ROLLED_BACK（崩溃撤掉）不出现
 * - 按冻结快照的错误原因归类；老师改卡片后旧错因仍绑定 v旧版 卡片
 */
export function MistakesPage() {
  const store = useAnswerRecordStore();
  const [reason, setReason] = useState<string>("ALL");

  useEffect(() => {
    void store.loadMistakes();
  }, []);

  const reasons = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of store.rows) map.set(row.mistake_reason, (map.get(row.mistake_reason) ?? 0) + 1);
    return [...map.entries()];
  }, [store.rows]);

  const rows = useMemo(
    () => store.rows.filter((r) => reason === "ALL" || r.mistake_reason === reason),
    [store.rows, reason]
  );

  return (
    <section className="page-body">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">braille-trainer / mistakes</p>
          <h1>错题本</h1>
          <p className="subtitle">只统计已结算记录；每条错因都钉在开练时冻结的卡片版本上，老师改版不影响旧账。</p>
        </div>
      </div>

      <div className="filter-bar">
        <button className={reason === "ALL" ? "chip active" : "chip"} onClick={() => setReason("ALL")}>
          全部（{store.rows.length}）
        </button>
        {reasons.map(([key, count]) => (
          <button key={key} className={reason === key ? "chip active" : "chip"} onClick={() => setReason(key)}>
            {MistakeReasonText[key as MistakeReason] ?? key}（{count}）
          </button>
        ))}
      </div>

      {rows.length === 0 ? <EmptyState title="暂无错题" hint="崩溃撤掉的 ROLLED_BACK 记录不会进入错题本。" /> : null}
      <div className="mistake-list">
        {rows.map((row) => (
          <article className="mistake-card panel" key={row.id}>
            <BrailleCell pattern={row.symbol_snapshot?.cell_pattern ?? ""} size={64} />
            <div className="mistake-meta">
              <div className="mistake-line">
                <strong>{row.symbol_snapshot?.letter ?? row.symbol_id}</strong>
                <ResultBadge value={row.status} />
                <span className="version-tag">冻结 v{row.symbol_snapshot?.version ?? "?"}</span>
              </div>
              <div className="mistake-line muted">
                你的答案：{row.user_answer || "（空）"} · 正确答案：{row.expected_answer}
              </div>
              <div className="mistake-line">
                <span className="chip">{MistakeReasonText[row.mistake_reason as MistakeReason] ?? row.mistake_reason}</span>
                <span className="muted">会话 #{row.session_id} · {row.latency_ms}ms</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
