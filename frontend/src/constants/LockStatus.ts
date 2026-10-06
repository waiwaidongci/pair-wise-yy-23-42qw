export const LockStatus = ["free", "held", "expired"] as const;
export type LockStatus = (typeof LockStatus)[number];
export const LockStatusText: Record<LockStatus, string> = {
  free: "空闲",
  held: "持有中",
  expired: "已过期"
};
