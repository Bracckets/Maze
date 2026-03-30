import { Brand } from "@/components/brand";
import { SignInForm } from "@/components/signin-form";

const stats = [
  { label: "Sessions analyzed", value: "4.2M" },
  { label: "Avg. time to insight", value: "6 min" },
  { label: "Drop-offs recovered", value: "31%" },
  { label: "Delivery uptime", value: "99.8%" },
];

export default function SignInPage() {
  return (
    <main className="signin-shell">
      <div className="signin-card">
        {/* Left panel */}
        <div className="signin-left">
          <div>
            <Brand />
            <p
              style={{
                marginTop: 32,
                fontSize: "1.5rem",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
                color: "var(--text)",
                maxWidth: 340,
              }}
            >
              Understand why users stop before they finish.
            </p>
            <p
              className="subtext"
              style={{ marginTop: 14, fontSize: "0.9rem", maxWidth: 360 }}
            >
              Maze watches every session and surfaces the friction your team
              doesn't know is there.
            </p>
          </div>

          <div className="signin-stats">
            {stats.map((s) => (
              <div className="signin-stat" key={s.label}>
                <p className="metric-label">{s.label}</p>
                <p className="metric-num" style={{ fontSize: "1.5rem" }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="signin-right">
          <div>
            <div className="heading" style={{ marginBottom: 4 }}>
              Sign in to Maze
            </div>
            <p className="subtext" style={{ fontSize: "0.86rem" }}>
              Enter your workspace credentials to continue.
            </p>
          </div>

          <SignInForm />

          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-3)",
              textAlign: "center",
            }}
          >
            By signing in you agree to our{" "}
            <a href="/terms" style={{ color: "var(--text-2)" }}>
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" style={{ color: "var(--text-2)" }}>
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
