export const LedgerStatus = ["pending", "settled", "revoked"] as const;
export type LedgerStatus = (typeof LedgerStatus)[number];
export const LedgerStatusText: Record<LedgerStatus, string> = {
  pending: "待结算",
  settled: "已结算",
  revoked: "已撤账"
};
