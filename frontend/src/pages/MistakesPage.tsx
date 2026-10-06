import { useEffect, useMemo, useState } from "react";
import { useAnswerRecordStore } from "../stores/AnswerRecordStore";
import { useBrailleSymbolStore } from "../stores/BrailleSymbolStore";
import { BrailleCell } from "../components/common/BrailleCell";
import { ResultBadge } from "../components/common/ResultBadge";
import { EmptyState } from "../components/common/EmptyState";
import { StatusBadge } from "../components/common/StatusBadge";
import type { AnswerRecord } from "../types/AnswerRecord";
import type { BrailleSymbol } from "../types/BrailleSymbol";

export function MistakesPage() {
  const { rows: records, load } = useAnswerRecordStore();
  const { rows: symbols, load: loadSymbols } = useBrailleSymbolStore();
  const [reasonFilter, setReasonFilter] = useState<string>("all");

  useEffect(() => {
    void load();
    void loadSymbols();
  }, [load, loadSymbols]);

  const symbolMap = useMemo(() => {
    const m = new Map<number, BrailleSymbol>();
    symbols.forEach((s) => m.set(s.id, s));
    return m;
  }, [symbols]);

  const mistakes = useMemo(() => {
    return records.filter((r) => r.correct === "false");
  }, [records]);

  const reasons = useMemo(() => {
    const set = new Set(mistakes.map((r) => r.mistake_reason).filter(Boolean));
    return Array.from(set);
  }, [mistakes]);

  const filtered = useMemo(() => {
    if (reasonFilter === "all") return mistakes;
    return mistakes.filter((r) => r.mistake_reason === reasonFilter);
  }, [mistakes, reasonFilter]);

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">braille-trainer</p>
          <h1>错题本</h1>
        </div>
        <StatusBadge value={`${mistakes.length} 道错题`} />
      </div>

      <div className="panel">
        <h2>按错误原因归类</h2>
        <div className="filter-row">
          <button className={reasonFilter === "all" ? "active" : ""} onClick={() => setReasonFilter("all")}>全部</button>
          {reasons.map((r) => (
            <button key={r} className={reasonFilter === r ? "active" : ""} onClick={() => setReasonFilter(r)}>{r}</button>
          ))}
        </div>
      </div>

      <div className="panel">
        {filtered.length === 0 ? (
          <EmptyState title="暂无错题，继续保持" />
        ) : (
          <div className="mistake-list">
            {filtered.map((r: AnswerRecord) => {
              const sym = symbolMap.get(r.symbol_id);
              return (
                <article key={r.id} className="mistake-row">
                  <BrailleCell title={sym?.letter ?? "?"} value={sym?.cell_pattern ?? ""} />
                  <div className="mistake-meta">
                    <ResultBadge value={r.mistake_reason || "错误"} />
                    <span>作答：{r.user_answer}</span>
                    <span>op_id：{r.op_id}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
