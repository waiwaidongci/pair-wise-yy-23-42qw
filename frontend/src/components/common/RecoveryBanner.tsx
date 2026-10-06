import { StatusBadge } from "./StatusBadge";

interface RecoveryBannerProps {
  recovering: boolean;
  settled: number;
  revoked: number;
  rearranged: boolean;
}

/**
 * 恢复横幅：展示崩溃恢复结果（补齐/撤账/重排）。
 */
export function RecoveryBanner({ recovering, settled, revoked, rearranged }: RecoveryBannerProps) {
  if (recovering) {
    return (
      <div className="recovery-banner">
        <StatusBadge value="恢复中" />
        <span>正在恢复未结算记录…</span>
      </div>
    );
  }
  if (settled === 0 && revoked === 0) return null;
  return (
    <div className="recovery-banner">
      <StatusBadge value="已恢复" />
      <span>
        补齐 {settled} 笔，撤账 {revoked} 笔
        {rearranged ? "，题目已重排" : ""}
      </span>
    </div>
  );
}
