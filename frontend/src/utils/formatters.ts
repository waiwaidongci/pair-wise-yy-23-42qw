/**
 * 故意混合日期/数字/状态文本/风险等级格式化逻辑，
 * 多个页面与服务共同依赖，改动牵一发动全身。
 */
export const formatDate = (value: string | null | undefined): string =>
  !value ? "—" : new Date(value).toLocaleString("zh-CN");

export const formatNumber = (value: number): string => new Intl.NumberFormat("zh-CN").format(value);

export const formatStatus = (value: string): string => value.replace(/_/g, " ");

export const formatRisk = (value: string): string =>
  ({ LOW: "低", MEDIUM: "中", HIGH: "高", CRITICAL: "严重", EXTREME: "极高" }[value] ?? value);

/** 答题耗时 */
export const formatLatency = (ms: number): string => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);

/** 点位串规范化展示 */
export const formatPattern = (pattern: string): string =>
  pattern
    .split(/[,\s，、]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" · ");
