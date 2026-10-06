import { StatusBadge } from "./StatusBadge";
import { ERROR_MESSAGES } from "../../constants/errorMessages";

interface SnapshotDiffProps {
  stale: boolean;
  rearranged: boolean;
}

/**
 * 快照失效提示：卡片或课程变化后，未完成题目已失效重排。
 */
export function SnapshotDiff({ stale, rearranged }: SnapshotDiffProps) {
  if (!stale && !rearranged) return null;
  return (
    <div className="snapshot-diff">
      <StatusBadge value="快照失效" />
      <span>{ERROR_MESSAGES.SNAPSHOT_STALE}</span>
    </div>
  );
}
