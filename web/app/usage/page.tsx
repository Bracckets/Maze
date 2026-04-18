import { DashboardShell } from "@/components/site-shell";
import { MonthSelector } from "@/components/month-selector";
import { Card, Tag } from "@/components/ui";
import { getUsage, UsageResponse } from "@/lib/service-gateway";

function formatLimit(limit: number | null): string {
  return limit === null ? "Unlimited" : limit.toLocaleString();
}

function formatPercent(percent: number | null): string {
  return percent === null ? "n/a" : `${percent.toFixed(1)}%`;
}

function usageTone(percent: number | null): "green" | "amber" | "red" | "default" {
  if (percent === null) return "default";
  if (percent >= 90) return "red";
  if (percent >= 70) return "amber";
  return "green";
}

function isUsageResponse(value: UsageResponse | { detail?: string }): value is UsageResponse {
  return "workspaceId" in value && "events" in value && "daily" in value;
}

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const usageResult = await getUsage(month);
  const usage = usageResult.ok && isUsageResponse(usageResult.data) ? usageResult.data : null;

  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let index = 0; index < 6; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleString("default", { month: "long", year: "numeric" });
    months.push({ value, label });
  }

  const selectedMonth = month ?? months[0].value;
  const maxEvents = Math.max(...(usage?.daily.map((item) => item.events) ?? [1]), 1);

  return (
    <DashboardShell
      activePath="/usage"
      title="Usage"
      subtitle="Monthly consumption, plan headroom, and recent daily movement in a quieter view."
      headerAction={<MonthSelector months={months} selected={selectedMonth} />}
    >
      {!usage ? (
        <Card className="pollex-surface">
          <div className="heading" style={{ marginBottom: 8 }}>
            Usage unavailable
          </div>
          <p className="subtext">No usage data was returned for this month. Try another range from the selector.</p>
        </Card>
      ) : (
        <section className="pollex-usage-page">
          <div className="pollex-stat-grid">
            <Card className="pollex-stat-card">
              <span>Events</span>
              <strong>{usage.events.used.toLocaleString()}</strong>
              <em>of {formatLimit(usage.events.limit)}</em>
            </Card>
            <Card className="pollex-stat-card">
              <span>Sessions</span>
              <strong>{usage.sessions.used.toLocaleString()}</strong>
              <em>of {formatLimit(usage.sessions.limit)}</em>
            </Card>
            <Card className="pollex-stat-card">
              <span>API requests</span>
              <strong>{usage.apiRequests.used.toLocaleString()}</strong>
              <em>of {formatLimit(usage.apiRequests.limit)}</em>
            </Card>
            <Card className="pollex-stat-card">
              <span>Plan</span>
              <strong>{usage.planName ?? "No plan"}</strong>
              <em>{usage.workspaceName}</em>
            </Card>
          </div>

          <div className="pollex-dashboard-grid pollex-dashboard-grid-data">
            <Card className="pollex-surface pollex-surface-large">
              <div className="pollex-surface-head">
                <div>
                  <h2 className="heading">Monthly activity</h2>
                  <p className="panel-copy">{usage.monthStart} to {usage.monthEnd}</p>
                </div>
                <Tag tone="accent">{usage.daily.length} daily rows</Tag>
              </div>

              <div className="pollex-usage-chart">
                {usage.daily.length > 0 ? (
                  usage.daily.slice(-12).map((item) => (
                    <div className="pollex-usage-chart-row" key={item.date}>
                      <span>{item.date}</span>
                      <div className="pollex-usage-chart-track">
                        <div
                          className="pollex-usage-chart-fill"
                          style={{ width: `${Math.max(12, (item.events / maxEvents) * 100)}%` }}
                        />
                      </div>
                      <strong>{item.events.toLocaleString()}</strong>
                    </div>
                  ))
                ) : (
                  <p className="empty-copy">No daily usage has been recorded for this month.</p>
                )}
              </div>
            </Card>

            <Card className="pollex-surface">
              <div className="pollex-surface-head">
                <h2 className="heading">Plan pressure</h2>
              </div>
              <div className="pollex-note-stack">
                <div className="pollex-usage-note">
                  <span>Events</span>
                  <Tag tone={usageTone(usage.events.percent)}>{formatPercent(usage.events.percent)}</Tag>
                </div>
                <div className="pollex-usage-note">
                  <span>Sessions</span>
                  <Tag tone={usageTone(usage.sessions.percent)}>{formatPercent(usage.sessions.percent)}</Tag>
                </div>
                <div className="pollex-usage-note">
                  <span>API requests</span>
                  <Tag tone={usageTone(usage.apiRequests.percent)}>{formatPercent(usage.apiRequests.percent)}</Tag>
                </div>
              </div>
            </Card>

            <Card className="pollex-surface">
              <div className="pollex-surface-head">
                <h2 className="heading">Workspace summary</h2>
              </div>
              <div className="pollex-note-stack">
                <p>{usage.workspaceName}</p>
                <p>{usage.planName ?? "No active plan"}</p>
                <p>Updated {usage.updatedAt}</p>
              </div>
            </Card>
          </div>
        </section>
      )}
    </DashboardShell>
  );
}
