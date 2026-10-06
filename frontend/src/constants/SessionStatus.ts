export const SessionStatus = ["active", "completed", "abandoned"] as const;
export type SessionStatus = (typeof SessionStatus)[number];
export const SessionStatusText: Record<SessionStatus, string> = {
  active: "进行中",
  completed: "已完成",
  abandoned: "已放弃"
};
