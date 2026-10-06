import { StatusBadge } from "./StatusBadge";

export function PracticePanel({ title = "PracticePanel", value = "READY" }: { title?: string; value?: string }) {
  return <div className="shared-widget"><strong>{title}</strong><StatusBadge value={value} /></div>;
}
