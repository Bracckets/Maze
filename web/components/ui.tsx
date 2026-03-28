import { ReactNode } from "react";

export function Card({
  children,
  className = "",
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div className={`card ${accent ? "card-accent" : ""} ${className}`.trim()}>
      {children}
    </div>
  );
}

// Keep Panel as alias for backward compat where still used
export const Panel = Card;

export function Tag({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "green" | "amber" | "red";
}) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

// Pill kept as alias
export const Pill = Tag;

export function KpiCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <div className="card">
      <p className="metric-label">{label}</p>
      <p className="metric-num">{value}</p>
      {delta && <p className="metric-delta">{delta}</p>}
    </div>
  );
}

// kept for backward compat
export const MetricCard = KpiCard;

export function StatusDot({ status }: { status: "online" | "degraded" | "offline" }) {
  const cls = status === "online" ? "dot-green" : status === "degraded" ? "dot-amber" : "dot-red";
  return <span className={`dot ${cls}`} />;
}
