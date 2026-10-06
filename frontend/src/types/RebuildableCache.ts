/**
 * 可重建缓存条目：空间不足时优先整体清空，绝不保留半份缓存而挤掉账本。
 * 典型内容：题库派生统计、卡片音频提示文本、图表聚合结果。
 */
export interface RebuildableCache {
  key: string;
  value: unknown;
  rebuilt_at: string;
  /** 依赖的账本内容指纹，指纹变化后缓存可安全丢弃重建 */
  source_fingerprint: string;
}
