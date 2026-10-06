import { StatusBadge } from "./StatusBadge";

export function ChartPanel({ title = "ChartPanel", value = "READY" }: { title?: string; value?: string }) {
  return <div className="shared-widget"><strong>{title}</strong><StatusBadge value={value} /></div>;
}
