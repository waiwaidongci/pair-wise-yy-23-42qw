import { useMemo } from "react";
import { normalizePattern } from "../../services/grading";

/**
 * 盲文六点格：
 *  1 4
 *  2 5
 *  3 6
 * 支持传入 "1,4" / "1 4" / "1，4" 等点位写法。
 */
export function BrailleCell({
  pattern = "",
  size = 72,
  active = false,
  title
}: {
  pattern?: string;
  size?: number;
  active?: boolean;
  title?: string;
}) {
  const dots = useMemo(() => {
    const set = new Set(normalizePattern(pattern).split(",").filter(Boolean).map(Number));
    return [1, 2, 3, 4, 5, 6].map((n) => ({ n, on: set.has(n) }));
  }, [pattern]);

  const dot = size * 0.17;
  const gap = size * 0.06;
  const pad = size * 0.12;

  return (
    <div className={"braille-cell" + (active ? " active" : "")} title={title ?? `点位 ${pattern}`} aria-label={`盲文点位 ${pattern}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        {dots.map(({ n, on }) => {
          const col = n <= 3 ? 0 : 1;
          const row = (n - 1) % 3;
          const cx = pad + col * (dot + gap) + dot / 2;
          const cy = pad + row * (dot + gap) + dot / 2;
          return <circle key={n} className={on ? "dot on" : "dot"} cx={cx} cy={cy} r={dot / 2} />;
        })}
      </svg>
    </div>
  );
}
