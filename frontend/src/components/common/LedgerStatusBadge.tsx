import { StatusBadge } from "./StatusBadge";
import { LedgerStatusText } from "../../constants/LedgerStatus";

export function LedgerStatusBadge({ status }: { status: keyof typeof LedgerStatusText }) {
  return <StatusBadge value={LedgerStatusText[status]} />;
}
