import { ReactNode } from "react";

export function Panel({
  children,
  className = "",
  glow = false
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return <section className={`panel ${glow ? "panel-glow" : ""} ${className}`.trim()}>{children}</section>;
}

export function MetricCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Panel className="metric-card">
      <p className="metric-label">{label}</p>
      <strong className="metric-value">{value}</strong>
      <span className="metric-detail">{detail}</span>
    </Panel>
  );
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "soft" | "light" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
