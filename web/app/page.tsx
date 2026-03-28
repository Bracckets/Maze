import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { Card, Tag } from "@/components/ui";

const stats = [
  { label: "Behaviors captured", value: "4.2M", delta: "+18% this week" },
  { label: "Drop-offs recovered", value: "31%",  delta: "after 2 experiments" },
  { label: "Time to first insight", value: "6 min", delta: "from session to fix" },
];

const features = [
  {
    icon: "◎",
    title: "Session replay & funnel",
    body: "See exactly where users hesitate, quit, or tap into nothing — rebuilt as a clean step-by-step journey.",
  },
  {
    icon: "⚡",
    title: "Friction detection",
    body: "Rage taps, dead zones, slow screens, form loops. Detected automatically. Ranked by impact.",
  },
  {
    icon: "✦",
    title: "AI-generated fixes",
    body: "Each insight comes with a plain-English explanation and a suggested next step for your team.",
  },
];

const howItWorks = [
  { step: "01", title: "Install the SDK", body: "Drop one line into your iOS or Android app. Maze starts capturing events immediately." },
  { step: "02", title: "Watch the data flow", body: "Sessions stream in real time. The dashboard populates within minutes of your first user." },
  { step: "03", title: "Act on insights", body: "The AI surfaces what's broken and why. Ship the fix. Watch completion rates climb." },
];

export default function HomePage() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="marketing-hero">
        <p className="eyebrow">Mobile UX intelligence</p>
        <h1 className="display" style={{ marginBottom: 20 }}>
          Find out why users<br />
          <span className="gradient-text">don't finish signing up.</span>
        </h1>
        <p className="subtext" style={{ fontSize: "1.05rem", maxWidth: 520, marginBottom: 28 }}>
          Maze captures every tap, pause, and failed form submit in your mobile app — then tells you
          exactly what to fix and why it matters.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-primary btn-lg" href="/signin">Get started free</Link>
          <Link className="btn btn-ghost btn-lg" href="/dashboard">See the dashboard</Link>
        </div>
      </section>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--gap)", marginBottom: 28 }}>
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="metric-label">{s.label}</p>
            <p className="metric-num">{s.value}</p>
            <p className="metric-delta">{s.delta}</p>
          </Card>
        ))}
      </div>

      {/* Features */}
      <div className="feature-strip">
        {features.map((f) => (
          <Card key={f.title}>
            <div className="feature-icon">{f.icon}</div>
            <div className="heading" style={{ marginBottom: 8 }}>{f.title}</div>
            <p className="subtext" style={{ fontSize: "0.88rem" }}>{f.body}</p>
          </Card>
        ))}
      </div>

      {/* How it works */}
      <Card style={{ marginBottom: 28 }}>
        <p className="eyebrow" style={{ marginBottom: 24 }}>How it works</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--gap)" }}>
          {howItWorks.map((item) => (
            <div key={item.step}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.1em", marginBottom: 10 }}>
                {item.step}
              </div>
              <div className="heading" style={{ marginBottom: 6 }}>{item.title}</div>
              <p className="subtext" style={{ fontSize: "0.86rem" }}>{item.body}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* CTA band */}
      <Card accent>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div className="display-sm" style={{ marginBottom: 6 }}>Ready to fix your funnel?</div>
            <p className="subtext" style={{ fontSize: "0.9rem" }}>
              Start free. No card required. Your first insight in under 10 minutes.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <Link className="btn btn-primary btn-lg" href="/signin">Start for free</Link>
            <Link className="btn btn-ghost btn-lg" href="/pricing">See pricing</Link>
          </div>
        </div>
      </Card>
    </SiteShell>
  );
}
