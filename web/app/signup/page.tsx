import { Brand } from "@/components/brand";
import { SignUpForm } from "@/components/signup-form";

const highlights = [
  { label: "Setup time", value: "10 min" },
  { label: "SDKs included", value: "iOS + Android" },
  { label: "Insights generated", value: "Live" },
  { label: "Billing model", value: "Workspace" },
];

export default function SignUpPage() {
  return (
    <main className="signin-shell">
      <div className="signin-card">
        <div className="signin-left">
          <div>
            <Brand />
            <p style={{ marginTop: 32, fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.2, color: "var(--text)", maxWidth: 340 }}>
              Create a workspace and start capturing mobile friction.
            </p>
            <p className="subtext" style={{ marginTop: 14, fontSize: "0.9rem", maxWidth: 360 }}>
              Maze provisions your workspace, issues API keys, and lets your team move from SDK install to live insight quickly.
            </p>
          </div>

          <div className="signin-stats">
            {highlights.map((item) => (
              <div className="signin-stat" key={item.label}>
                <p className="metric-label">{item.label}</p>
                <p className="metric-num" style={{ fontSize: "1.5rem" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="signin-right">
          <div>
            <div className="heading" style={{ marginBottom: 4 }}>Create your Maze workspace</div>
            <p className="subtext" style={{ fontSize: "0.86rem" }}>We&apos;ll sign you in right after the workspace is created.</p>
          </div>

          <SignUpForm />

          <p style={{ fontSize: "0.8rem", color: "var(--text-3)", textAlign: "center" }}>
            By creating an account you agree to our{" "}
            <a href="/terms" style={{ color: "var(--text-2)" }}>Terms</a> and{" "}
            <a href="/privacy" style={{ color: "var(--text-2)" }}>Privacy Policy</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
