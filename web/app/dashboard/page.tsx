import Link from "next/link";

import { DashboardShell } from "@/components/site-shell";
import { Card, KpiCard, StatusDot, Tag } from "@/components/ui";
import { getIntegrationStatus } from "@/lib/service-gateway";
import { getInsights } from "@/lib/site-data";

const funnel = [
  { stage: "Welcome screen",   pct: 100, users: "2,340" },
  { stage: "Phone number",     pct: 82,  users: "1,919" },
  { stage: "OTP verification", pct: 67,  users: "1,568" },
  { stage: "KYC form",         pct: 44,  users: "1,030" },
  { stage: "Account approved", pct: 31,  users: "725" },
];

const sessions = [
  { id: "s_1041", screen: "kyc_form",        friction: "Rage taps",     users: 14, time: "11:42", severity: "red" as const },
  { id: "s_1032", screen: "otp_verification", friction: "Slow response", users: 9,  time: "11:17", severity: "amber" as const },
  { id: "s_1028", screen: "welcome",          friction: "Dead taps",     users: 4,  time: "10:58", severity: "amber" as const },
  { id: "s_1022", screen: "kyc_form",         friction: "Drop-off",      users: 28, time: "10:46", severity: "red" as const },
];

const frictionToneMap: Record<string, "red" | "amber" | "green"> = {
  "Rage taps":     "red",
  "Drop-off":      "red",
  "Slow response": "amber",
  "Dead taps":     "amber",
};

export default async function DashboardPage() {
  const insights = await getInsights();
  const integrations = await getIntegrationStatus();

  return (
    <DashboardShell
      title="Dashboard"
      subtitle="Session behavior across your onboarding flow — last 24 hours."
    >
      {/* KPI strip */}
      <div className="kpi-strip">
        <KpiCard label="Sessions today"      value="2,340" delta="+12% vs yesterday" />
        <KpiCard label="Completion rate"     value="31%"   delta="-3pts this week" />
        <KpiCard label="Friction events"     value="847"   delta="+18% this week" />
        <KpiCard label="Delivery success"    value="92.4%" delta="Last 24 hours" />
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "var(--gap)" }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

          {/* Funnel */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div className="heading">Onboarding funnel</div>
                <div className="subtext" style={{ fontSize: "0.84rem", marginTop: 2 }}>Where users drop off during sign-up</div>
              </div>
              <Tag tone="accent">Live</Tag>
            </div>

            <div className="funnel">
              {funnel.map((item, i) => (
                <div className="funnel-row" key={item.stage}>
                  <div className="funnel-header">
                    <span className="funnel-label">{item.stage}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="funnel-users">{item.users} users</span>
                      <span className="funnel-pct">{item.pct}%</span>
                    </div>
                  </div>
                  <div className="funnel-track">
                    <div
                      className="funnel-fill"
                      style={{
                        width: `${item.pct}%`,
                        opacity: 1 - i * 0.12,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="divider" />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
              <span style={{ color: "var(--text-3)" }}>1,615 users lost in funnel</span>
              <span style={{ color: "var(--red)", fontWeight: 600 }}>−69% total drop</span>
            </div>
          </Card>

          {/* Session table */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div className="heading">Recent friction sessions</div>
                <div className="subtext" style={{ fontSize: "0.84rem", marginTop: 2 }}>Highest-impact sessions from today</div>
              </div>
              <Link href="/settings" className="btn btn-ghost btn-sm">View all</Link>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Screen</th>
                  <th>Friction type</th>
                  <th>Users</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td style={{ color: "var(--text-2)" }}>{row.screen}</td>
                    <td>
                      <Tag tone={frictionToneMap[row.friction] ?? "default"}>
                        {row.friction}
                      </Tag>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--text)" }}>{row.users}</td>
                    <td style={{ color: "var(--text-3)" }}>{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

          {/* Insights */}
          <Card accent>
            <div style={{ marginBottom: 16 }}>
              <div className="heading">Top insights</div>
              <div className="subtext" style={{ fontSize: "0.84rem", marginTop: 2 }}>AI-detected friction patterns</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {insights.length > 0 ? (
                insights.slice(0, 4).map((insight) => (
                  <div
                    className="insight-card"
                    key={`${insight.issue_type}-${insight.screen}`}
                  >
                    <div className="insight-title">{insight.title}</div>
                    <div className="insight-body">{insight.impact}</div>
                    <div className="insight-footer">
                      <Tag>{insight.screen}</Tag>
                      <Tag tone="accent">{insight.frequency} events</Tag>
                    </div>
                  </div>
                ))
              ) : (
                <div className="insight-card">
                  <div className="insight-title">Backend not connected</div>
                  <div className="insight-body">
                    Start the FastAPI backend to see live AI insights here.
                  </div>
                  <div className="insight-footer">
                    <Tag tone="amber">Offline</Tag>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Integration status */}
          <Card>
            <div style={{ marginBottom: 14 }}>
              <div className="heading">Integrations</div>
            </div>

            <div>
              {integrations.services.map((service) => (
                <div className="list-row" key={service.name}>
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                      {service.name}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                      {service.path}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <StatusDot status={service.status === "ready" ? "online" : "degraded"} />
                    <span style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>{service.status}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <Link href="/settings" className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                Manage integrations
              </Link>
            </div>
          </Card>

        </div>
      </div>
    </DashboardShell>
  );
}
