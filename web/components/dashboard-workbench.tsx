"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Insight, Issue, SessionSummary } from "@/lib/site-data";

import { Card, StatusDot, Tag } from "@/components/ui";

type IntegrationService = {
  name: string;
  path: string;
  status: string;
};

type Props = {
  insights: Insight[];
  issues: Issue[];
  sessions: SessionSummary[];
  integrations: IntegrationService[];
};

type DashboardTab = "charts" | "data" | "insights" | "integrations";
type DataTab = "sessions" | "issues";

type ChartTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{
    color?: string;
    dataKey?: string;
    name?: string;
    value?: number | string;
  }>;
};

const tabLabels: Record<DashboardTab, string> = {
  charts: "Charts",
  data: "Data",
  insights: "Insights",
  integrations: "Integrations",
};

const dataTabLabels: Record<DataTab, string> = {
  sessions: "Sessions",
  issues: "Issues",
};

const issueToneMap: Record<string, "red" | "amber" | "green" | "default"> = {
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

const integrationTagToneMap: Record<string, "green" | "amber" | "red" | "default"> = {
  healthy: "green",
  configured: "green",
  connected: "green",
  degraded: "amber",
  attention: "amber",
  offline: "red",
};

const chartPalette = {
  line: "#dfeafc",
  area: "rgba(186, 208, 239, 0.48)",
  areaSecondary: "rgba(226, 192, 123, 0.44)",
  bar: "#efe8d8",
  barSoft: "#b0c6eb",
  amber: "#e2c07b",
  red: "#e59080",
  green: "#99d7b2",
  grid: "rgba(255,255,255,0.08)",
  axis: "rgba(187,184,178,0.72)",
};

function toCsv(headers: string[], rows: string[][]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatShortTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="pollex-chart-tooltip">
      {label ? <strong>{label}</strong> : null}
      {payload.map((entry) => (
        <div className="pollex-chart-tooltip-row" key={`${entry.dataKey}-${entry.name}`}>
          <span className="pollex-chart-tooltip-dot" style={{ backgroundColor: entry.color ?? chartPalette.line }} />
          <span>{entry.name ?? entry.dataKey}</span>
          <strong>{entry.value ?? 0}</strong>
        </div>
      ))}
    </div>
  );
}

function getInsightKey(insight: Insight, index: number) {
  return [
    insight.title,
    insight.screen,
    insight.issue_type,
    insight.frequency,
    insight.impact,
    index,
  ].join("-");
}

export function DashboardWorkbench({
  insights,
  issues,
  sessions,
  integrations,
}: Props) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("charts");
  const [activeDataTab, setActiveDataTab] = useState<DataTab>("sessions");

  const totalSessions = sessions.length;
  const dropOffs = sessions.filter((session) => session.dropped_off).length;
  const completionRate = totalSessions > 0 ? Math.round(((totalSessions - dropOffs) / totalSessions) * 100) : 0;
  const activeScreens = new Set(sessions.map((session) => session.last_screen).filter(Boolean)).size;
  const topIssue = issues[0];

  const sessionBuckets = useMemo(() => {
    const buckets = new Map<string, { sessions: number; dropOffs: number }>();
    sessions.forEach((session) => {
      const date = new Date(session.start_time);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const key = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
      const current = buckets.get(key) ?? { sessions: 0, dropOffs: 0 };
      current.sessions += 1;
      if (session.dropped_off) {
        current.dropOffs += 1;
      }
      buckets.set(key, current);
    });

    return Array.from(buckets.entries())
      .slice(-7)
      .map(([label, value]) => ({
        label,
        sessions: value.sessions,
        dropOffs: value.dropOffs,
      }));
  }, [sessions]);

  const screenActivity = useMemo(() => {
    const buckets = new Map<string, number>();
    sessions.forEach((session) => {
      const label = session.last_screen ?? "unknown";
      buckets.set(label, (buckets.get(label) ?? 0) + 1);
    });
    return Array.from(buckets.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([screen, value]) => ({ screen, value }));
  }, [sessions]);

  const issueMix = useMemo(() => {
    const buckets = new Map<string, number>();
    issues.forEach((issue) => {
      buckets.set(issue.type, (buckets.get(issue.type) ?? 0) + issue.frequency);
    });
    return Array.from(buckets.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, value]) => ({ type: type.replace(/_/g, " "), value }));
  }, [issues]);

  const completionSplit = useMemo(
    () => [
      { name: "Completed", value: Math.max(totalSessions - dropOffs, 0), color: chartPalette.green },
      { name: "Dropped off", value: dropOffs, color: chartPalette.red },
    ],
    [dropOffs, totalSessions],
  );

  const integrationHealth = useMemo(() => {
    const buckets = { healthy: 0, degraded: 0, offline: 0 };
    integrations.forEach((integration) => {
      if (integration.status === "healthy" || integration.status === "configured" || integration.status === "connected") {
        buckets.healthy += 1;
        return;
      }
      if (integration.status === "offline") {
        buckets.offline += 1;
        return;
      }
      buckets.degraded += 1;
    });

    return [
      { name: "Healthy", value: buckets.healthy, fill: chartPalette.green },
      { name: "Degraded", value: buckets.degraded, fill: chartPalette.amber },
      { name: "Offline", value: buckets.offline, fill: chartPalette.red },
    ];
  }, [integrations]);

  const radialCompletion = useMemo(
    () => [{ name: "Completion", value: completionRate, fill: chartPalette.line }],
    [completionRate],
  );

  const sessionCsv = useMemo(
    () =>
      toCsv(
        ["session_id", "device_id", "last_screen", "status", "start_time", "end_time"],
        sessions.map((session) => [
          session.session_id,
          session.device_id,
          session.last_screen ?? "unknown",
          session.dropped_off ? "Dropped off" : "Completed",
          session.start_time,
          session.end_time,
        ]),
      ),
    [sessions],
  );

  const issueCsv = useMemo(
    () =>
      toCsv(
        ["id", "type", "screen", "frequency", "affected_users", "severity"],
        issues.map((issue) => [
          issue.id,
          issue.type,
          issue.screen ?? "unknown",
          String(issue.frequency),
          String(issue.affected_users_count),
          issue.severity,
        ]),
      ),
    [issues],
  );

  const insightCsv = useMemo(
    () =>
      toCsv(
        ["title", "screen", "issue_type", "frequency", "affected_users", "impact"],
        insights.map((insight) => [
          insight.title,
          insight.screen,
          insight.issue_type,
          String(insight.frequency),
          String(insight.affected_users_count),
          insight.impact,
        ]),
      ),
    [insights],
  );

  const integrationCsv = useMemo(
    () =>
      toCsv(
        ["name", "path", "status"],
        integrations.map((integration) => [integration.name, integration.path, integration.status]),
      ),
    [integrations],
  );

  return (
    <section className="pollex-dashboard">
      <div className="pollex-tabbar" role="tablist" aria-label="Dashboard views">
        {(Object.keys(tabLabels) as DashboardTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`pollex-tab ${activeTab === tab ? "active" : ""}`.trim()}
            onClick={() => setActiveTab(tab)}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div className="pollex-stat-grid">
        <Card className="pollex-stat-card">
          <span>Sessions</span>
          <strong>{totalSessions}</strong>
          <em>Live traffic in the current workspace</em>
        </Card>
        <Card className="pollex-stat-card">
          <span>Completion</span>
          <strong>{completionRate}%</strong>
          <em>{dropOffs} sessions ended before success</em>
        </Card>
        <Card className="pollex-stat-card">
          <span>Primary friction</span>
          <strong>{topIssue ? topIssue.type.replace(/_/g, " ") : "No issue"}</strong>
          <em>{topIssue ? `${topIssue.frequency} recent events` : "Nothing urgent surfaced"}</em>
        </Card>
        <Card className="pollex-stat-card">
          <span>Active screens</span>
          <strong>{activeScreens}</strong>
          <em>Observed surfaces in recent sessions</em>
        </Card>
      </div>

      {activeTab === "charts" ? (
        <div className="pollex-dashboard-grid">
          <Card className="pollex-surface pollex-surface-large">
            <div className="pollex-surface-head">
              <div>
                <h2 className="heading">Session volume</h2>
                <p className="panel-copy">Traffic and drop-off movement across the latest capture window.</p>
              </div>
              <Tag tone="accent">{sessionBuckets.length} points</Tag>
            </div>
            <div className="pollex-chart-shell pollex-chart-shell-tall">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sessionBuckets} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pollexSessionsArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartPalette.area} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={chartPalette.area} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="pollexDropOffArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartPalette.areaSecondary} stopOpacity={0.65} />
                      <stop offset="100%" stopColor={chartPalette.areaSecondary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={chartPalette.grid} strokeDasharray="3 6" vertical={false} />
                  <XAxis axisLine={false} dataKey="label" tick={{ fill: chartPalette.axis, fontSize: 12 }} tickLine={false} />
                  <YAxis axisLine={false} tick={{ fill: chartPalette.axis, fontSize: 12 }} tickLine={false} width={34} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.12)" }} />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    name="Sessions"
                    stroke={chartPalette.line}
                    strokeWidth={2}
                    fill="url(#pollexSessionsArea)"
                  />
                  <Area
                    type="monotone"
                    dataKey="dropOffs"
                    name="Drop-offs"
                    stroke={chartPalette.amber}
                    strokeWidth={2}
                    fill="url(#pollexDropOffArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="pollex-surface pollex-surface-large">
            <div className="pollex-surface-head">
              <div>
                <h2 className="heading">Friction mix</h2>
                <p className="panel-copy">Issue types ranked by total frequency, with the loudest problems first.</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv("pollex-issues.csv", issueCsv)}>
                Export CSV
              </button>
            </div>
            <div className="pollex-chart-shell pollex-chart-shell-tall">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issueMix} layout="vertical" margin={{ top: 10, right: 10, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={chartPalette.grid} horizontal={false} strokeDasharray="3 6" />
                  <XAxis axisLine={false} tick={{ fill: chartPalette.axis, fontSize: 12 }} tickLine={false} type="number" />
                  <YAxis
                    axisLine={false}
                    dataKey="type"
                    tick={{ fill: chartPalette.axis, fontSize: 12 }}
                    tickLine={false}
                    type="category"
                    width={110}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="value" name="Events" radius={[0, 12, 12, 0]} fill={chartPalette.barSoft} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="pollex-surface">
            <div className="pollex-surface-head">
              <h2 className="heading">Top screens</h2>
              <Tag>{screenActivity.length} tracked</Tag>
            </div>
            <div className="pollex-chart-shell">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={screenActivity} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={chartPalette.grid} strokeDasharray="3 6" vertical={false} />
                  <XAxis axisLine={false} dataKey="screen" tick={{ fill: chartPalette.axis, fontSize: 12 }} tickLine={false} />
                  <YAxis axisLine={false} tick={{ fill: chartPalette.axis, fontSize: 12 }} tickLine={false} width={34} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="value" name="Sessions" radius={[10, 10, 0, 0]} fill={chartPalette.bar} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="pollex-surface">
            <div className="pollex-surface-head">
              <h2 className="heading">Completion split</h2>
              <Tag tone={completionRate >= 70 ? "green" : "amber"}>{completionRate}% stable</Tag>
            </div>
            <div className="pollex-chart-shell pollex-chart-shell-centered pollex-chart-shell-compact">
              <div className="pollex-chart-viewport pollex-chart-viewport-compact">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={completionSplit}
                      dataKey="value"
                      innerRadius={34}
                      outerRadius={52}
                      paddingAngle={4}
                      stroke="rgba(24,24,24,0.5)"
                      strokeWidth={2}
                    >
                      {completionSplit.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="pollex-chart-legend">
                {completionSplit.map((entry) => (
                  <div className="pollex-chart-legend-row" key={entry.name}>
                    <span className="pollex-chart-tooltip-dot" style={{ backgroundColor: entry.color }} />
                    <span>{entry.name}</span>
                    <strong>{entry.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="pollex-surface">
            <div className="pollex-surface-head">
              <h2 className="heading">Workspace health</h2>
              <Tag tone={integrations.some((service) => service.status === "offline") ? "amber" : "green"}>
                {integrations.some((service) => service.status === "offline") ? "Attention" : "Healthy"}
              </Tag>
            </div>
            <div className="pollex-chart-shell pollex-chart-shell-centered">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={radialCompletion}
                  innerRadius="68%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  barSize={18}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background dataKey="value" cornerRadius={999} />
                  <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="pollex-radial-value">
                    {completionRate}%
                  </text>
                  <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" className="pollex-radial-label">
                    completion
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pollex-chart-legend">
                {integrationHealth.map((entry) => (
                  <div className="pollex-chart-legend-row" key={entry.name}>
                    <span className="pollex-chart-tooltip-dot" style={{ backgroundColor: entry.fill }} />
                    <span>{entry.name}</span>
                    <strong>{entry.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "data" ? (
        <div className="pollex-dashboard-grid pollex-dashboard-grid-data">
          <Card className="pollex-surface pollex-surface-large pollex-surface-full">
            <div className="pollex-surface-head">
              <div>
                <h2 className="heading">Workspace data</h2>
                <p className="panel-copy">Switch between session and issue feeds without leaving the data surface.</p>
              </div>
              <div className="pollex-tabbar pollex-tabbar-subtle" role="tablist" aria-label="Data views">
                {(Object.keys(dataTabLabels) as DataTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeDataTab === tab}
                    className={`pollex-tab ${activeDataTab === tab ? "active" : ""}`.trim()}
                    onClick={() => setActiveDataTab(tab)}
                  >
                    {dataTabLabels[tab]}
                  </button>
                ))}
              </div>
            </div>
            {activeDataTab === "sessions" ? (
              <>
                <div className="pollex-surface-head">
                  <div>
                    <h3 className="heading">Recent sessions</h3>
                    <p className="panel-copy">The latest captured sessions, kept minimal and easy to scan.</p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv("pollex-sessions.csv", sessionCsv)}>
                    Export CSV
                  </button>
                </div>
                <div className="table-shell">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Session</th>
                        <th>Device</th>
                        <th>Screen</th>
                        <th>Status</th>
                        <th>Started</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.slice(0, 10).map((session) => (
                        <tr key={session.session_id}>
                          <td>{session.session_id.slice(0, 8)}</td>
                          <td>{session.device_id}</td>
                          <td>{session.last_screen ?? "unknown"}</td>
                          <td>
                            <Tag tone={session.dropped_off ? "amber" : "green"}>
                              {session.dropped_off ? "Dropped off" : "Completed"}
                            </Tag>
                          </td>
                          <td>{formatTime(session.start_time)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="pollex-surface-head">
                  <div>
                    <h3 className="heading">Detected issues</h3>
                    <p className="panel-copy">Current friction events and their severity, without extra dashboard noise.</p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv("pollex-issues.csv", issueCsv)}>
                    Export CSV
                  </button>
                </div>
                <div className="table-shell">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Screen</th>
                        <th>Frequency</th>
                        <th>Affected</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.slice(0, 10).map((issue) => (
                        <tr key={issue.id}>
                          <td>
                            <Tag tone={issueToneMap[issue.type] ?? "default"}>{issue.type.replace(/_/g, " ")}</Tag>
                          </td>
                          <td>{issue.screen ?? "unknown"}</td>
                          <td>{issue.frequency}</td>
                          <td>{issue.affected_users_count}</td>
                          <td>{issue.severity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </div>
      ) : null}

      {activeTab === "insights" ? (
        <div className="pollex-dashboard-grid">
          <Card className="pollex-surface pollex-surface-large">
            <div className="pollex-surface-head">
              <div>
                <h2 className="heading">Priority insights</h2>
                <p className="panel-copy">The most actionable explanations currently surfaced from behavioral signals.</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv("pollex-insights.csv", insightCsv)}>
                Export CSV
              </button>
            </div>
            <div className="pollex-insight-grid">
              {insights.length > 0 ? (
                insights.slice(0, 6).map((insight, index) => (
                  <article className="pollex-insight-card" key={getInsightKey(insight, index)}>
                    <div className="pollex-insight-topline">
                      <Tag tone="accent">{insight.screen}</Tag>
                      <Tag>{insight.frequency} events</Tag>
                    </div>
                    <h3>{insight.title}</h3>
                    <p>{insight.impact}</p>
                  </article>
                ))
              ) : (
                <p className="empty-copy">Pollex will surface product insights here once the workspace has enough signal.</p>
              )}
            </div>
          </Card>

          <Card className="pollex-surface">
            <div className="pollex-surface-head">
              <h2 className="heading">Suggested next moves</h2>
            </div>
            <div className="pollex-note-stack">
              {insights.slice(0, 4).map((insight, index) => (
                <div key={`${getInsightKey(insight, index)}-notes`}>
                  <strong>{insight.title}</strong>
                  <p>{insight.suggestions[0] ?? "Review the session evidence and tighten the target flow."}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="pollex-surface">
            <div className="pollex-surface-head">
              <h2 className="heading">Latest sessions</h2>
            </div>
            <div className="pollex-note-stack">
              {sessions.slice(0, 4).map((session) => (
                <div key={`${session.session_id}-summary`}>
                  <strong>{session.last_screen ?? "unknown"}</strong>
                  <p>{formatShortTime(session.start_time)} from device {session.device_id}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "integrations" ? (
        <div className="pollex-dashboard-grid">
          <Card className="pollex-surface pollex-surface-large">
            <div className="pollex-surface-head">
              <div>
                <h2 className="heading">Connected services</h2>
                <p className="panel-copy">Instrumentation and operational endpoints in one quiet view.</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv("pollex-integrations.csv", integrationCsv)}>
                Export CSV
              </button>
            </div>
            <div className="pollex-ranked-list">
              {integrations.map((integration) => (
                <div className="pollex-ranked-row" key={integration.name}>
                  <div>
                    <strong>{integration.name}</strong>
                    <span>{integration.path}</span>
                  </div>
                  <div className="pollex-inline-status">
                    <StatusDot status={integrationToneMap[integration.status] ?? "degraded"} />
                    <Tag tone={integrationTagToneMap[integration.status] ?? "default"}>{integration.status}</Tag>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="pollex-surface">
            <div className="pollex-surface-head">
              <h2 className="heading">Workspace health</h2>
            </div>
            <div className="pollex-note-stack">
              <p>{integrations.filter((integration) => integration.status === "healthy" || integration.status === "connected").length} services are stable.</p>
              <p>{integrations.filter((integration) => integration.status === "degraded" || integration.status === "attention").length} services need review.</p>
              <p>{integrations.filter((integration) => integration.status === "offline").length} services are offline.</p>
            </div>
          </Card>

          <Card className="pollex-surface">
            <div className="pollex-surface-head">
              <h2 className="heading">Why this view stays quiet</h2>
            </div>
            <div className="pollex-note-stack">
              <p>Only service state, path, and actionability stay visible in the primary scan.</p>
              <p>Everything else can live in docs or detailed settings instead of crowding the workspace.</p>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
