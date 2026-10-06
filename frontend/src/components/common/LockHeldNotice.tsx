import { StatusBadge } from "./StatusBadge";
import { ERROR_MESSAGES } from "../../constants/errorMessages";

interface LockHeldNoticeProps {
  visible: boolean;
}

/**
 * 锁占用提示：另一标签页正在结算，已保留作答现场。
 */
export function LockHeldNotice({ visible }: LockHeldNoticeProps) {
  if (!visible) return null;
  return (
    <div className="lock-held-notice">
      <StatusBadge value="标签页并发" />
      <span>{ERROR_MESSAGES.LEDGER_LOCK_HELD}</span>
    </div>
  );
}
