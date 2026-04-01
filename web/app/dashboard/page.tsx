import Link from "next/link";

import { DashboardShell } from "@/components/site-shell";
import { Card, KpiCard, StatusDot, Tag } from "@/components/ui";
import { getIntegrationStatus } from "@/lib/service-gateway";
import { getInsights, getIssues, getSessions } from "@/lib/site-data";

const toneMap: Record<string, "red" | "amber" | "green"> = {
  rage_tap: "red",
  drop_off: "red",
  slow_response: "amber",
  dead_tap: "amber",
  form_friction: "amber",
};

const integrationToneMap: Record<string, "online" | "degraded" | "offline"> = {
  healthy: "online",
  configured: "online",
  connected: "online",
  degraded: "degraded",
  attention: "degraded",
  offline: "offline",
};

const integrationTagToneMap: Record<
  string,
  "green" | "amber" | "red" | "default"
> = {
  healthy: "green",
  configured: "green",
  connected: "green",
  degraded: "amber",
  attention: "amber",
  offline: "red",
};

export default async function DashboardPage() {
  const [insights, integrations, issues, sessions] = await Promise.all([
    getInsights(),
    getIntegrationStatus(),
    getIssues(),
    getSessions(),
  ]);
  console.log("Sessions:", sessions);
  const totalSessions = sessions.length;
  const dropOffs = sessions.filter((session) => session.dropped_off).length;
  const completionRate =
    totalSessions > 0
      ? `${Math.round(((totalSessions - dropOffs) / totalSessions) * 100)}%`
      : "0%";
  const activeScreens = new Set(
    sessions.map((session) => session.last_screen).filter(Boolean),
  ).size;

  return (
    <DashboardShell
      title="Dashboard"
      subtitle="Live session behavior across your current workspace."
    >
      <div className="kpi-strip">
        <KpiCard
          label="Sessions tracked"
          value={String(totalSessions)}
          delta="Live from PostgreSQL"
        />
        <KpiCard
          label="Completion rate"
          value={completionRate}
          delta={`${dropOffs} drop-offs observed`}
        />
        <KpiCard
          label="Friction issues"
          value={String(issues.length)}
          delta="Detected from recent sessions"
        />
        <KpiCard
          label="Active screens"
          value={String(activeScreens)}
          delta="Screens seen in recent traffic"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: "var(--gap)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--gap)",
          }}
        >
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <div className="heading">Recent sessions</div>
                <div
                  className="subtext"
                  style={{ fontSize: "0.84rem", marginTop: 2 }}
                >
                  Latest sessions recorded by the ingestion pipeline
                </div>
              </div>
              <Tag tone="accent">Live</Tag>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Device</th>
                  <th>Last screen</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 8).map((session) => (
                  <tr key={session.session_id}>
                    <td>{session.session_id.slice(0, 8)}</td>
                    <td style={{ color: "var(--text-2)" }}>
                      {session.device_id}
                    </td>
                    <td>{session.last_screen ?? "unknown"}</td>
                    <td>
                      <Tag tone={session.dropped_off ? "amber" : "green"}>
                        {session.dropped_off ? "Dropped off" : "Completed"}
                      </Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {sessions.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-3)" }}>
                No sessions ingested yet. Generate an API key in Settings and
                send SDK events to begin.
              </p>
            ) : null}
          </Card>

          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <div className="heading">Detected issues</div>
                <div
                  className="subtext"
                  style={{ fontSize: "0.84rem", marginTop: 2 }}
                >
                  Live friction patterns inferred from your stored events
                </div>
              </div>
              <Link href="/heatmap" className="btn btn-ghost btn-sm">
                Open heatmap
              </Link>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Screen</th>
                  <th>Frequency</th>
                  <th>Affected</th>
                </tr>
              </thead>
              <tbody>
                {issues.slice(0, 8).map((issue) => (
                  <tr key={issue.id}>
                    <td>
                      <Tag tone={toneMap[issue.type] ?? "default"}>
                        {issue.type.replace(/_/g, " ")}
                      </Tag>
                    </td>
                    <td>{issue.screen ?? "unknown"}</td>
                    <td>{issue.frequency}</td>
                    <td>{issue.affected_users_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {issues.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-3)" }}>
                No friction issues have been detected yet.
              </p>
            ) : null}
          </Card>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--gap)",
          }}
        >
          <Card accent>
            <div style={{ marginBottom: 16 }}>
              <div className="heading">Top insights</div>
              <div
                className="subtext"
                style={{ fontSize: "0.84rem", marginTop: 2 }}
              >
                Generated from your current workspace events
              </div>
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
                  <div className="insight-title">No insights yet</div>
                  <div className="insight-body">
                    Once the SDK starts sending events, Maze will surface
                    friction patterns here.
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div style={{ marginBottom: 14 }}>
              <div className="heading">Integrations</div>
            </div>

            <div>
              {integrations.services.map((service) => (
                <div className="list-row" key={service.name}>
                  <div>
                    <div
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: 2,
                      }}
                    >
                      {service.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--text-3)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {service.path}
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <StatusDot
                      status={integrationToneMap[service.status] ?? "degraded"}
                    />
                    <Tag
                      tone={integrationTagToneMap[service.status] ?? "default"}
                    >
                      {service.status}
                    </Tag>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <Link
                href="/settings"
                className="btn btn-ghost btn-sm"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Manage integrations
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
