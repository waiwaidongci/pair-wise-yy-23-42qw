import { useEffect, useMemo, useState } from "react";
import { useBrailleSymbolStore } from "../stores/BrailleSymbolStore";
import { useLessonStore } from "../stores/LessonStore";
import { BrailleCell } from "../components/common/BrailleCell";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState } from "../components/common/EmptyState";
import { SymbolCategories, SymbolCategoryText } from "../constants/SymbolCategory";
import type { BrailleSymbol as SymbolType } from "../types/BrailleSymbol";
import type { Lesson } from "../types/Lesson";
import { formatDate } from "../utils/formatters";

/**
 * 学习卡片页：浏览卡片 + 老师改卡片/课程。
 * 任意保存都会让内容版本 +1，进行中的练习会话在提交/进入时失效重排。
 */
export function LearnPage() {
  const symbolStore = useBrailleSymbolStore();
  const lessonStore = useLessonStore();
  const [category, setCategory] = useState<string>("ALL");
  const [editingSymbol, setEditingSymbol] = useState<Partial<SymbolType> | null>(null);
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);

  useEffect(() => {
    void symbolStore.load();
    void lessonStore.load();
  }, []);

  const symbols = useMemo(
    () => symbolStore.rows.filter((s) => category === "ALL" || s.category === category),
    [symbolStore.rows, category]
  );

  return (
    <section className="page-body">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">braille-trainer / learn</p>
          <h1>学习卡片</h1>
          <p className="subtitle">开练会冻结卡片快照；此处改卡片后，进行中会话的未完成题会失效重排，旧错因仍以快照为准。</p>
        </div>
        <StatusBadge value="LOCAL_DATA" />
      </div>

      <div className="filter-bar">
        <button className={category === "ALL" ? "chip active" : "chip"} onClick={() => setCategory("ALL")}>全部</button>
        {SymbolCategories.map((c) => (
          <button key={c} className={category === c ? "chip active" : "chip"} onClick={() => setCategory(c)}>
            {SymbolCategoryText[c]}
          </button>
        ))}
        <button className="chip primary" onClick={() => setEditingSymbol({ letter: "", cell_pattern: "" })}>＋ 新建卡片</button>
      </div>

      {symbolStore.error ? <div className="alert error">{symbolStore.error}</div> : null}

      <div className="card-grid">
        {symbols.map((s) => (
          <article className="symbol-card panel" key={s.id}>
            <BrailleCell pattern={s.cell_pattern} size={88} />
            <div className="symbol-meta">
              <div className="symbol-letter">{s.letter} <small>{s.pinyin}</small></div>
              <div className="symbol-tags">
                <StatusBadge value={s.category} />
                <span className="version-tag">v{s.version}</span>
              </div>
              <div className="symbol-foot">难度 {s.difficulty} · {formatDate(s.updated_at)}</div>
              <button className="link-btn" onClick={() => setEditingSymbol(s)}>老师改卡片</button>
            </div>
          </article>
        ))}
      </div>
      {symbols.length === 0 ? <EmptyState title="该分类暂无卡片" /> : null}

      <h2 className="section-title">课程（改动后进行中的会话失效）</h2>
      <div className="table panel">
        {lessonStore.rows.map((lesson) => (
          <article className="row" key={lesson.id}>
            <strong>{lesson.title}</strong>
            <span>{lesson.symbol_ids.length} 张卡片 · {lesson.estimated_minutes} 分钟</span>
            <span className="version-tag">v{lesson.version}</span>
            <button className="link-btn" onClick={() => setEditingLesson(lesson)}>改课程</button>
          </article>
        ))}
        <button className="chip primary" onClick={() => setEditingLesson({ title: "", symbol_ids: [] })}>＋ 新建课程</button>
      </div>

      {editingSymbol ? (
        <SymbolEditor
          initial={editingSymbol}
          onCancel={() => setEditingSymbol(null)}
          onSaved={async (payload) => {
            const saved = await symbolStore.save(payload);
            if (saved) setEditingSymbol(null);
          }}
        />
      ) : null}
      {editingLesson ? (
        <LessonEditor
          initial={editingLesson}
          symbols={symbolStore.rows}
          onCancel={() => setEditingLesson(null)}
          onSaved={async (payload) => {
            const saved = await lessonStore.save(payload);
            if (saved) setEditingLesson(null);
          }}
        />
      ) : null}
    </section>
  );
}

function Modal({ title, children, onCancel }: { title: string; children: React.ReactNode; onCancel: () => void }) {
  return (
    <div className="modal-mask" onClick={onCancel}>
      <div className="modal panel" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function SymbolEditor({
  initial,
  onSaved,
  onCancel
}: {
  initial: Partial<SymbolType>;
  onSaved: (payload: Partial<SymbolType> & Pick<SymbolType, "letter" | "cell_pattern">) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<SymbolType>>(initial);
  const set = (patch: Partial<SymbolType>) => setForm((f) => ({ ...f, ...patch }));
  return (
    <Modal title={initial.id ? `改卡片 #${initial.id}（保存后版本 +1）` : "新建卡片"} onCancel={onCancel}>
      <div className="form-grid">
        <label>字符<input value={form.letter ?? ""} onChange={(e) => set({ letter: e.target.value })} /></label>
        <label>拼音<input value={form.pinyin ?? ""} onChange={(e) => set({ pinyin: e.target.value })} /></label>
        <label>点位（如 1,4）<input value={form.cell_pattern ?? ""} onChange={(e) => set({ cell_pattern: e.target.value })} /></label>
        <label>难度
          <select value={form.difficulty ?? "1"} onChange={(e) => set({ difficulty: e.target.value })}>
            <option value="1">1</option><option value="2">2</option><option value="3">3</option>
          </select>
        </label>
        <label>分类
          <select value={form.category ?? "LETTER"} onChange={(e) => set({ category: e.target.value })}>
            {SymbolCategories.map((c) => <option key={c} value={c}>{SymbolCategoryText[c]}</option>)}
          </select>
        </label>
        <label>音频提示键<input value={form.audio_hint_key ?? ""} onChange={(e) => set({ audio_hint_key: e.target.value })} /></label>
      </div>
      <div className="modal-actions">
        <button className="chip" onClick={onCancel}>取消</button>
        <button className="chip primary" disabled={!form.letter || !form.cell_pattern} onClick={() => void onSaved(form as SymbolType)}>保存（版本 +1）</button>
      </div>
    </Modal>
  );
}

function LessonEditor({
  initial,
  symbols,
  onSaved,
  onCancel
}: {
  initial: Partial<Lesson>;
  symbols: SymbolType[];
  onSaved: (payload: Partial<Lesson> & Pick<Lesson, "title">) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Lesson>>(initial);
  const toggleSymbol = (id: number) => {
    const ids = new Set(form.symbol_ids ?? []);
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    setForm((f) => ({ ...f, symbol_ids: [...ids].sort((a, b) => a - b) }));
  };
  return (
    <Modal title={initial.id ? `改课程 #${initial.id}（保存后版本 +1）` : "新建课程"} onCancel={onCancel}>
      <div className="form-grid">
        <label>课程标题<input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>阶段<input value={form.stage ?? "STAGE_1"} onChange={(e) => setForm({ ...form, stage: e.target.value })} /></label>
        <label>预计分钟<input type="number" value={form.estimated_minutes ?? 10} onChange={(e) => setForm({ ...form, estimated_minutes: Number(e.target.value) })} /></label>
        <label>解锁规则<input value={form.unlock_rule ?? "NONE"} onChange={(e) => setForm({ ...form, unlock_rule: e.target.value })} /></label>
      </div>
      <div className="symbol-picker">
        {symbols.map((s) => (
          <label key={s.id} className={form.symbol_ids?.includes(s.id) ? "picked" : ""}>
            <input type="checkbox" checked={form.symbol_ids?.includes(s.id) ?? false} onChange={() => toggleSymbol(s.id)} />
            {s.letter}（{s.cell_pattern}）
          </label>
        ))}
      </div>
      <div className="modal-actions">
        <button className="chip" onClick={onCancel}>取消</button>
        <button className="chip primary" disabled={!form.title} onClick={() => void onSaved(form as Lesson)}>保存（版本 +1）</button>
      </div>
    </Modal>
  );
}
