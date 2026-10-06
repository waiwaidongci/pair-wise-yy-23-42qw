import { useEffect, useMemo, useState } from "react";
import { useLessonStore } from "../stores/LessonStore";
import { useBrailleSymbolStore } from "../stores/BrailleSymbolStore";
import { BrailleCell } from "../components/common/BrailleCell";
import { LessonProgress } from "../components/common/LessonProgress";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState } from "../components/common/EmptyState";
import { useBraillePattern } from "../hooks/useBraillePattern";
import type { BrailleSymbol } from "../types/BrailleSymbol";

export function LearnPage() {
  const { rows: lessons, load: loadLessons } = useLessonStore();
  const { rows: symbols, load: loadSymbols } = useBrailleSymbolStore();
  const [activeLesson, setActiveLesson] = useState<number>(0);
  const { page, setPage, pageRows, total } = useBraillePattern(symbols);

  useEffect(() => {
    void loadLessons();
    void loadSymbols();
  }, [loadLessons, loadSymbols]);

  const symbolMap = useMemo(() => {
    const m = new Map<number, BrailleSymbol>();
    symbols.forEach((s) => m.set(s.id, s));
    return m;
  }, [symbols]);

  const lessonSymbols = useMemo(() => {
    const lesson = lessons.find((l) => l.id === activeLesson);
    if (!lesson) return [];
    return lesson.symbol_ids.map((id) => symbolMap.get(id)).filter(Boolean) as BrailleSymbol[];
  }, [lessons, activeLesson, symbolMap]);

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">braille-trainer</p>
          <h1>学习卡片</h1>
        </div>
        <StatusBadge value={`${total} 张卡片`} />
      </div>

      <div className="panel">
        <h2>课程</h2>
        <div className="lesson-list">
          {lessons.length === 0 && <EmptyState title="暂无课程" />}
          {lessons.map((l) => (
            <button
              key={l.id}
              className={activeLesson === l.id ? "active" : ""}
              onClick={() => setActiveLesson(l.id)}
            >
              {l.title} · {l.symbol_ids.length} 张
            </button>
          ))}
        </div>
      </div>

      {activeLesson > 0 && (
        <div className="panel">
          <h2>课程卡片</h2>
          <LessonProgress title="课程进度" value={`${lessonSymbols.length} 张`} />
          <div className="card-grid">
            {lessonSymbols.map((s) => (
              <BrailleCell key={s.id} title={s.letter} value={s.cell_pattern} />
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <h2>全部卡片</h2>
        <div className="card-grid">
          {pageRows.map((s) => (
            <BrailleCell key={s.id} title={s.letter} value={s.cell_pattern} />
          ))}
        </div>
        <div className="pagination">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>上一页</button>
          <span>{page} / {Math.ceil(total / 8)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page * 8 >= total}>下一页</button>
        </div>
      </div>
    </section>
  );
}
