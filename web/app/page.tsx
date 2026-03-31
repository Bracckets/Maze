import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { Card, Tag } from "@/components/ui";
import { getCurrentUser } from "@/lib/service-gateway";

const stats = [
  { label: "Behaviors captured", value: "4.2M", delta: "+18% this week", icon: "◎" },
  { label: "Drop-offs recovered", value: "31%",  delta: "after 2 experiments", icon: "↑" },
  { label: "Time to first insight", value: "6m", delta: "from session to fix", icon: "⚡" },
];

const features = [
  {
    icon: "◎",
    title: "Session replay & funnel",
    body: "See exactly where users hesitate, quit, or tap into nothing — rebuilt as a clean step-by-step journey.",
    tag: "Core",
  },
  {
    icon: "⚡",
    title: "Friction detection",
    body: "Rage taps, dead zones, slow screens, form loops. Detected automatically. Ranked by impact.",
    tag: "AI-powered",
  },
  {
    icon: "✦",
    title: "AI-generated fixes",
    body: "Each insight comes with a plain-English explanation and a suggested next step for your team.",
    tag: "LLM",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Install the SDK",
    body: "Drop one line into your iOS or Android app. Maze starts capturing events immediately — no config needed.",
    glyph: "◈",
  },
  {
    step: "02",
    title: "Watch the data flow",
    body: "Sessions stream in real time. The dashboard populates within minutes of your first user.",
    glyph: "∿",
  },
  {
    step: "03",
    title: "Act on insights",
    body: "The AI surfaces what's broken and why. Ship the fix. Watch completion rates climb.",
    glyph: "✦",
  },
];

const signals = [
  { label: "Rage tap", color: "var(--red)", desc: "Repeated frustrated taps" },
  { label: "Dead zone", color: "var(--amber)", desc: "Taps with no response" },
  { label: "Drop-off", color: "var(--accent)", desc: "Session abandonment point" },
  { label: "Form friction", color: "var(--accent-2)", desc: "Repeated failed submissions" },
  { label: "Slow response", color: "var(--green)", desc: "Latency-induced hesitation" },
];

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const user = "user" in currentUser.data ? currentUser.data.user : null;

  return (
    <SiteShell>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="marketing-hero" style={{ paddingTop: 80, paddingBottom: 72 }}>
        {/* Animated background grid */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "linear-gradient(rgba(123,111,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(123,111,255,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
          pointerEvents: "none",
          zIndex: -1,
        }} />

        {/* Floating orb */}
        <div style={{
          position: "absolute",
          right: "5%",
          top: "10%",
          width: 320,
          height: 320,
          background: "radial-gradient(circle, rgba(123,111,255,0.12) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
          filter: "blur(40px)",
          animation: "float 6s ease-in-out infinite",
          zIndex: -1,
        }} />

        <div className="hero-badge">
          <span className="hero-badge-dot" />
          LLM-powered mobile UX intelligence
        </div>

        <h1 className="display" style={{ marginBottom: 24, animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both" }}>
          Find out why users<br />
          <span className="gradient-text">don't finish signing up.</span>
        </h1>

        <p className="subtext" style={{
          fontSize: "1.1rem",
          maxWidth: 560,
          marginBottom: 36,
          animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both",
        }}>
          Maze captures every tap, pause, and failed form submit in your mobile app —
          then tells you exactly what to fix and why it matters.
        </p>

        <div style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.3s both",
        }}>
          <Link className="btn btn-primary btn-lg" href={user ? "/dashboard" : "/signup"}>
            {user ? "Open dashboard" : "Get started free"}
            <span style={{ fontSize: "1.1rem", marginLeft: 2 }}>→</span>
          </Link>
          <Link className="btn btn-ghost btn-lg" href={user ? "/profile" : "/pricing"}>
            {user ? "View profile" : "See pricing"}
          </Link>
        </div>

        {/* Trust line */}
        <div style={{
          marginTop: 40,
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
          animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.4s both",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="dot dot-green" />
            <span style={{ fontSize: "0.79rem", color: "var(--text-3)", fontWeight: 500 }}>Live data pipeline</span>
          </div>
          <div style={{ width: 1, height: 14, background: "var(--border-strong)" }} />
          <span style={{ fontSize: "0.79rem", color: "var(--text-3)", fontWeight: 500 }}>No credit card required</span>
          <div style={{ width: 1, height: 14, background: "var(--border-strong)" }} />
          <span style={{ fontSize: "0.79rem", color: "var(--text-3)", fontWeight: 500 }}>iOS + Android SDKs</span>
        </div>
      </section>

      {/* ── Stats Strip ─────────────────────────────── */}
      <div className="stats-strip" style={{ marginBottom: 40 }}>
        {stats.map((s, i) => (
          <div className="stat-card" key={s.label} style={{ animationDelay: `${i * 0.1}s` }}>
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 16,
            }}>
              <p className="metric-label">{s.label}</p>
              <span style={{
                fontSize: "1.1rem",
                color: "var(--accent)",
                opacity: 0.6,
              }}>{s.icon}</span>
            </div>
            <p className="metric-num">{s.value}</p>
            <p className="metric-delta" style={{ marginTop: 8 }}>{s.delta}</p>
          </div>
        ))}
      </div>

      {/* ── Signal types visual ──────────────────────── */}
      <Card style={{ marginBottom: 28, padding: "32px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 28 }}>
          <div>
            <p className="eyebrow">What Maze detects</p>
            <p className="heading" style={{ marginBottom: 4 }}>Every friction signal, automatically classified</p>
            <p className="subtext" style={{ fontSize: "0.87rem" }}>Five behavior patterns that kill mobile activation.</p>
          </div>
          <Link className="btn btn-ghost btn-sm" href="/dashboard">View live dashboard →</Link>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {signals.map((sig) => (
            <div key={sig.label} style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-lg)",
              padding: "10px 16px",
              flex: "1 1 180px",
              minWidth: 160,
              transition: "all 0.2s",
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: sig.color,
                boxShadow: `0 0 8px ${sig.color}`,
                flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: 1 }}>{sig.label}</div>
                <div style={{ fontSize: "0.76rem", color: "var(--text-3)" }}>{sig.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Features ────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <p className="eyebrow" style={{ marginBottom: 16 }}>Core capabilities</p>
      </div>
      <div className="feature-strip" style={{ marginBottom: 40 }}>
        {features.map((f, i) => (
          <div className="feature-card" key={f.title} style={{ animationDelay: `${i * 0.12}s` }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div className="feature-icon">{f.icon}</div>
              <Tag tone="accent" style={{ fontSize: "0.68rem" }}>{f.tag}</Tag>
            </div>
            <div className="heading" style={{ marginBottom: 10 }}>{f.title}</div>
            <p className="subtext" style={{ fontSize: "0.87rem" }}>{f.body}</p>
          </div>
        ))}
      </div>

      {/* ── How it works ─────────────────────────────── */}
      <Card style={{ marginBottom: 28, padding: "36px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className="eyebrow">How it works</p>
            <p className="display-sm">Up and running in minutes</p>
          </div>
          <Link className="btn btn-outline-accent" href="/docs">Read the docs →</Link>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--gap)",
          position: "relative",
        }}>
          {/* Connector line */}
          <div style={{
            position: "absolute",
            top: 20,
            left: "calc(16.67% + 20px)",
            right: "calc(16.67% + 20px)",
            height: 1,
            background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
            opacity: 0.3,
            pointerEvents: "none",
          }} />

          {howItWorks.map((item, i) => (
            <div key={item.step} style={{ position: "relative", padding: "0 4px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: i === 0 ? "linear-gradient(135deg, var(--accent), var(--accent-2))" : "var(--surface-2)",
                  border: i === 0 ? "none" : "1px solid var(--border-strong)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "1.1rem",
                  color: i === 0 ? "#fff" : "var(--accent)",
                  flexShrink: 0,
                  boxShadow: i === 0 ? "0 4px 16px var(--accent-glow)" : "none",
                }}>
                  {item.glyph}
                </div>
                <div style={{
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  color: "var(--accent)",
                  letterSpacing: "0.12em",
                  fontFamily: "var(--font-mono)",
                }}>
                  {item.step}
                </div>
              </div>
              <div className="heading" style={{ marginBottom: 8 }}>{item.title}</div>
              <p className="subtext" style={{ fontSize: "0.86rem" }}>{item.body}</p>
            </div>
          ))}
        </div>

        {/* SDK code snippet */}
        <div style={{
          marginTop: 32,
          background: "var(--surface-0)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--r-lg)",
          padding: "18px 22px",
          fontFamily: "var(--font-mono)",
          fontSize: "0.82rem",
          color: "var(--text-2)",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, var(--accent-dim), transparent)" }} />
          <div style={{ color: "var(--text-3)", marginBottom: 8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>// iOS · Swift</div>
          <div><span style={{ color: "var(--accent-2)" }}>Maze</span><span style={{ color: "var(--text)" }}>.configure(</span><span style={{ color: "var(--green)" }}>"YOUR_API_KEY"</span><span style={{ color: "var(--text)" }}>)</span></div>
          <div style={{ marginTop: 4 }}><span style={{ color: "var(--accent-2)" }}>Maze</span><span style={{ color: "var(--text)" }}>.track(event: </span><span style={{ color: "var(--green)" }}>"signup_step_1"</span><span style={{ color: "var(--text)" }}>)</span></div>
        </div>
      </Card>

      {/* ── CTA band ─────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, var(--surface-1) 0%, rgba(123,111,255,0.08) 60%, rgba(165,148,255,0.05) 100%)",
        border: "1px solid rgba(123,111,255,0.25)",
        borderRadius: "var(--r-2xl)",
        padding: "48px 40px",
        position: "relative",
        overflow: "hidden",
        marginBottom: 0,
      }}>
        {/* Decorative rings */}
        <div style={{
          position: "absolute",
          right: -60,
          top: "50%",
          transform: "translateY(-50%)",
          width: 300,
          height: 300,
          borderRadius: "50%",
          border: "1px solid rgba(123,111,255,0.1)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute",
          right: -30,
          top: "50%",
          transform: "translateY(-50%)",
          width: 200,
          height: 200,
          borderRadius: "50%",
          border: "1px solid rgba(123,111,255,0.15)",
          pointerEvents: "none",
        }} />

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 32,
          flexWrap: "wrap",
          position: "relative",
          zIndex: 1,
        }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 12 }}>Ready to fix your funnel?</p>
            <div className="display-sm" style={{ marginBottom: 12 }}>
              Your first insight in under{" "}
              <span className="gradient-text">10 minutes.</span>
            </div>
            <p className="subtext" style={{ fontSize: "0.9rem", maxWidth: 420 }}>
              Start free. No card required. Maze works with your existing mobile codebase —
              iOS and Android.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
            <Link className="btn btn-primary btn-lg" href={user ? "/dashboard" : "/signup"}>
              {user ? "Open dashboard" : "Start for free"}
              <span style={{ marginLeft: 2 }}>→</span>
            </Link>
            <Link className="btn btn-ghost btn-lg" href="/pricing">See pricing</Link>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
