/** 极简条形图（不引第三方图表库，避免重型依赖），数据来自已结算账本的派生缓存 */
export function ChartPanel({
  title,
  data
}: {
  title: string;
  data: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="panel chart-panel">
      <h2>{title}</h2>
      {data.length === 0 ? (
        <div className="empty">暂无数据</div>
      ) : (
        <div className="bars">
          {data.map((d) => (
            <div className="bar-row" key={d.label}>
              <span className="bar-label">{d.label}</span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${(d.value / max) * 100}%` }} />
              </span>
              <span className="bar-value">{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
