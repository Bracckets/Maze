import { DashboardShell } from "@/components/site-shell";
import { Card, Tag } from "@/components/ui";
import { getUsage, UsageResponse } from "@/lib/service-gateway";
import { MonthSelector } from "@/components/month-selector";

function formatLimit(limit: number | null): string {
  return limit === null ? "Unlimited" : limit.toLocaleString();
}

function formatPercent(percent: number | null): string {
  return percent === null ? "n/a" : `${percent.toFixed(1)}%`;
}

function usageTone(
  percent: number | null,
): "green" | "amber" | "red" | "default" {
  if (percent === null) return "default";
  if (percent >= 90) return "red";
  if (percent >= 70) return "amber";
  return "green";
}

function isUsageResponse(
  value: UsageResponse | { detail?: string },
): value is UsageResponse {
  return "workspaceId" in value && "events" in value && "daily" in value;
}

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const usageResult = await getUsage(month);
  const usage =
    usageResult.ok && isUsageResponse(usageResult.data)
      ? usageResult.data
      : null;

  // Build last 6 months for the selector
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    months.push({ value, label });
  }

  const selectedMonth = month ?? months[0].value;

  return (
    <DashboardShell
      title="Usage"
      subtitle="Workspace usage and plan limits by month."
    >
      {/* Month selector */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: "0.85rem",
            color: "var(--text-2)",
            fontWeight: 500,
          }}
        >
          Viewing month:
        </span>
        <MonthSelector months={months} selected={selectedMonth} />
      </div>

      {!usage ? (
        <Card>
          <div className="heading" style={{ marginBottom: 8 }}>
            Usage unavailable
          </div>
          <p className="subtext" style={{ fontSize: "0.88rem" }}>
            No usage data found for this month. Try selecting a different month
            above.
          </p>
        </Card>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--gap)",
          }}
        >
          <div className="kpi-strip">
            <Card>
              <p className="metric-label">Events</p>
              <p className="metric-num">{usage.events.used.toLocaleString()}</p>
              <p className="metric-delta">
                of {formatLimit(usage.events.limit)}
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <Tag tone={usageTone(usage.events.percent)}>
                  {formatPercent(usage.events.percent)}
                </Tag>
              </div>
            </Card>

            <Card>
              <p className="metric-label">Sessions</p>
              <p className="metric-num">
                {usage.sessions.used.toLocaleString()}
              </p>
              <p className="metric-delta">
                of {formatLimit(usage.sessions.limit)}
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <Tag tone={usageTone(usage.sessions.percent)}>
                  {formatPercent(usage.sessions.percent)}
                </Tag>
              </div>
            </Card>

            <Card>
              <p className="metric-label">API requests</p>
              <p className="metric-num">
                {usage.apiRequests.used.toLocaleString()}
              </p>
              <p className="metric-delta">
                of {formatLimit(usage.apiRequests.limit)}
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <Tag tone={usageTone(usage.apiRequests.percent)}>
                  {formatPercent(usage.apiRequests.percent)}
                </Tag>
              </div>
            </Card>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 340px",
              gap: "var(--gap)",
            }}
          >
            <Card>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 18,
                }}
              >
                <div>
                  <div className="heading">Monthly trend</div>
                  <div
                    className="subtext"
                    style={{ fontSize: "0.84rem", marginTop: 2 }}
                  >
                    {usage.monthStart} to {usage.monthEnd}
                  </div>
                </div>
                <Tag tone="accent">{usage.daily.length} daily points</Tag>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Events</th>
                    <th>Sessions</th>
                    <th>API requests</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.daily.slice(-15).map((item) => (
                    <tr key={item.date}>
                      <td>{item.date}</td>
                      <td>{item.events.toLocaleString()}</td>
                      <td>{item.sessions.toLocaleString()}</td>
                      <td>{item.apiRequests.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {usage.daily.length === 0 ? (
                <p
                  className="subtext"
                  style={{ fontSize: "0.84rem", marginTop: 12 }}
                >
                  No daily usage recorded for this month.
                </p>
              ) : null}
            </Card>

            <Card accent>
              <div className="heading" style={{ marginBottom: 4 }}>
                Workspace summary
              </div>
              <p
                className="subtext"
                style={{ fontSize: "0.84rem", marginBottom: 14 }}
              >
                Usage calculated against your active plan limits.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                <Tag tone="green">{usage.planName ?? "No active plan"}</Tag>
                <Tag>{usage.workspaceName}</Tag>
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-3)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Updated: {usage.updatedAt}
              </div>
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
