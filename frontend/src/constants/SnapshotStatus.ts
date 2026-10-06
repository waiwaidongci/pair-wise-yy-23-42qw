export const SnapshotStatus = ["frozen", "stale", "rebuilt"] as const;
export type SnapshotStatus = (typeof SnapshotStatus)[number];
export const SnapshotStatusText: Record<SnapshotStatus, string> = {
  frozen: "已冻结",
  stale: "已失效",
  rebuilt: "已重建"
};
