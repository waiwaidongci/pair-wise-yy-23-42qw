export function LessonProgress({
  answered = 0,
  total = 0,
  mistakes = 0,
  label
}: {
  answered?: number;
  total?: number;
  mistakes?: number;
  label?: string;
}) {
  const percent = total === 0 ? 0 : Math.round((answered / total) * 100);
  return (
    <div className="lesson-progress">
      {label ? <div className="lesson-progress-label">{label}</div> : null}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-meta">
        <span>{answered}/{total} 题 · {percent}%</span>
        <span className="mistakes">错 {mistakes}</span>
      </div>
    </div>
  );
}
