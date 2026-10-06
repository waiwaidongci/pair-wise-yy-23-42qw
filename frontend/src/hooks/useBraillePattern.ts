import { useMemo } from "react";
import { normalizePattern } from "../services/grading";

/** 点位串 -> 六点布尔数组与交互状态，供点阵输入与展示复用 */
export function useBraillePattern(pattern: string) {
  return useMemo(() => {
    const set = new Set(normalizePattern(pattern).split(",").filter(Boolean).map(Number));
    const dots = [1, 2, 3, 4, 5, 6].map((n) => ({ n, on: set.has(n) }));
    const toggle = (n: number) => {
      if (set.has(n)) set.delete(n);
      else set.add(n);
      return [...set].sort((a, b) => a - b).join(",");
    };
    return { dots, normalized: normalizePattern(pattern), toggle, isEmpty: set.size === 0 };
  }, [pattern]);
}
