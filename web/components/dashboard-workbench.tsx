"use client";

import { useEffect, useMemo, useState } from "react";

import type { Insight, Issue, SessionSummary } from "@/lib/site-data";

import { Card, Tag, StatusDot } from "@/components/ui";

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

type InspectRow =
  | { title: string; rows: Array<[string, string]> }
  | null;

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

const expandedPanelMeta = {
  sessions: {
    title: "All Sessions",
    description: "Review every captured session in one calmer workspace and inspect the details only when needed.",
  },
  issues: {
    title: "All Friction Issues",
    description: "Scan the full issue list, then open any row for the specific context behind the signal.",
  },
  insights: {
    title: "All Insights",
    description: "Browse the highest-signal explanations from your workspace in a lighter, easier-to-scan sheet.",
  },
  integrations: {
    title: "All Integrations",
    description: "Check connected services, paths, and current status without leaving the dashboard surface.",
  },
} as const;

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

export function DashboardWorkbench({
  insights,
  issues,
  sessions,
  integrations,
}: Props) {
  const [expandedPanel, setExpandedPanel] = useState<
    "sessions" | "issues" | "insights" | "integrations" | null
  >(null);
  const [inspectRow, setInspectRow] = useState<InspectRow>(null);

  const totalSessions = sessions.length;
  const dropOffs = sessions.filter((session) => session.dropped_off).length;
  const completionRate =
    totalSessions > 0
      ? Math.round(((totalSessions - dropOffs) / totalSessions) * 100)
      : 0;
  const activeScreens = new Set(
    sessions.map((session) => session.last_screen).filter(Boolean),
  ).size;
  const topIssue = issues[0];
  const expandedMeta = expandedPanel ? expandedPanelMeta[expandedPanel] : null;

  useEffect(() => {
    if (!expandedPanel && !inspectRow) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (inspectRow) {
        setInspectRow(null);
        return;
      }

      setExpandedPanel(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expandedPanel, inspectRow]);

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
        integrations.map((service) => [service.name, service.path, service.status]),
      ),
    [integrations],
  );

  return (
    <>
      <section className="ops-hero">
        <div>
          <p className="eyebrow">Live workspace</p>
          <h2 className="ops-title">Behavior intelligence for your active product surface</h2>
          <p className="ops-copy">
            Track completion, pinpoint friction, and inspect the exact rows behind every
            signal without leaving the dashboard.
          </p>
        </div>
        <div className="ops-hero-grid">
          <div className="ops-pulse">
            <span className="ops-pulse-ring" />
            <span className="ops-pulse-core" />
            <div className="ops-pulse-copy">
              <strong>{completionRate}%</strong>
              <span>completion this window</span>
            </div>
          </div>
          <div className="ops-mini-metrics">
            <div>
              <span>Sessions</span>
              <strong>{totalSessions}</strong>
            </div>
            <div>
              <span>Friction issues</span>
              <strong>{issues.length}</strong>
            </div>
            <div>
              <span>Active screens</span>
              <strong>{activeScreens}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="ops-kpis">
        <Card className="kpi-panel">
          <p className="metric-label">Sessions tracked</p>
          <p className="metric-num">{totalSessions}</p>
          <p className="metric-delta">Updated from the current event stream</p>
        </Card>
        <Card className="kpi-panel">
          <p className="metric-label">Completion rate</p>
          <p className="metric-num">{completionRate}%</p>
          <p className="metric-delta">{dropOffs} sessions ended before success</p>
        </Card>
        <Card className="kpi-panel">
          <p className="metric-label">Primary friction</p>
          <p className="metric-num" style={{ fontSize: "1.8rem" }}>
            {topIssue ? topIssue.type.replace(/_/g, " ") : "None"}
          </p>
          <p className="metric-delta">
            {topIssue ? `${topIssue.frequency} events on ${topIssue.screen ?? "unknown"}` : "No friction detected"}
          </p>
        </Card>
        <Card className="kpi-panel">
          <p className="metric-label">Surfaces watched</p>
          <p className="metric-num">{activeScreens}</p>
          <p className="metric-delta">Distinct screens active in recent traffic</p>
        </Card>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-primary">
          <Card className="ops-panel">
            <div className="panel-head">
              <div>
                <div className="heading">Session stream</div>
                <p className="panel-copy">
                  Review the latest captured sessions, inspect timestamps, and export the full table.
                </p>
              </div>
              <div className="panel-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv("maze-sessions.csv", sessionCsv)}>
                  Export CSV
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setExpandedPanel("sessions")}>
                  Expand
                </button>
              </div>
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
                  {sessions.slice(0, 6).map((session) => (
                    <tr
                      key={session.session_id}
                      onClick={() =>
                        setInspectRow({
                          title: `Session ${session.session_id.slice(0, 8)}`,
                          rows: [
                            ["Session ID", session.session_id],
                            ["Device", session.device_id],
                            ["Last screen", session.last_screen ?? "unknown"],
                            ["Status", session.dropped_off ? "Dropped off" : "Completed"],
                            ["Started", formatTime(session.start_time)],
                            ["Ended", formatTime(session.end_time)],
                          ],
                        })
                      }
                    >
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
            {sessions.length === 0 ? (
              <p className="empty-copy">
                No sessions ingested yet. Once SDK traffic arrives, the stream will populate automatically.
              </p>
            ) : null}
          </Card>

          <Card className="ops-panel">
            <div className="panel-head">
              <div>
                <div className="heading">Friction registry</div>
                <p className="panel-copy">
                  Ranked product issues inferred from recent events, ready for inspection or export.
                </p>
              </div>
              <div className="panel-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv("maze-issues.csv", issueCsv)}>
                  Export CSV
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setExpandedPanel("issues")}>
                  Expand
                </button>
              </div>
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
                  {issues.slice(0, 6).map((issue) => (
                    <tr
                      key={issue.id}
                      onClick={() =>
                        setInspectRow({
                          title: issue.type.replace(/_/g, " "),
                          rows: [
                            ["Issue ID", issue.id],
                            ["Type", issue.type],
                            ["Screen", issue.screen ?? "unknown"],
                            ["Element", issue.element_id ?? "n/a"],
                            ["Frequency", String(issue.frequency)],
                            ["Affected users", String(issue.affected_users_count)],
                            ["Severity", issue.severity],
                          ],
                        })
                      }
                    >
                      <td>
                        <Tag tone={toneMap[issue.type] ?? "default"}>
                          {issue.type.replace(/_/g, " ")}
                        </Tag>
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
            {issues.length === 0 ? (
              <p className="empty-copy">No friction issues detected yet.</p>
            ) : null}
          </Card>
        </div>

        <div className="dashboard-secondary">
          <Card accent className="ops-panel ops-panel-accent">
            <div className="panel-head">
              <div>
                <div className="heading">Top insights</div>
                <p className="panel-copy">
                  The highest-signal explanations generated from your current workspace.
                </p>
              </div>
              <div className="panel-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv("maze-insights.csv", insightCsv)}>
                  Export
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setExpandedPanel("insights")}>
                  Expand
                </button>
              </div>
            </div>

            <div className="insight-stack">
              {insights.length > 0 ? (
                insights.slice(0, 4).map((insight) => (
                  <button
                    type="button"
                    className="insight-card insight-button"
                    key={`${insight.issue_type}-${insight.screen}-${insight.title}`}
                    onClick={() =>
                      setInspectRow({
                        title: insight.title,
                        rows: [
                          ["Screen", insight.screen],
                          ["Issue", insight.issue_type],
                          ["Frequency", String(insight.frequency)],
                          ["Affected users", String(insight.affected_users_count)],
                          ["Impact", insight.impact],
                          ["Suggestions", insight.suggestions.join("; ") || "n/a"],
                        ],
                      })
                    }
                  >
                    <div className="insight-title">{insight.title}</div>
                    <div className="insight-body">{insight.impact}</div>
                    <div className="insight-footer">
                      <Tag>{insight.screen}</Tag>
                      <Tag tone="accent">{insight.frequency} events</Tag>
                    </div>
                  </button>
                ))
              ) : (
                <div className="insight-card">
                  <div className="insight-title">No insights yet</div>
                  <div className="insight-body">
                    Once traffic arrives, Maze will surface behavioral patterns and recommended next actions here.
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="ops-panel">
            <div className="panel-head">
              <div>
                <div className="heading">Integrations</div>
                <p className="panel-copy">Connection health across your current product instrumentation.</p>
              </div>
              <div className="panel-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv("maze-integrations.csv", integrationCsv)}>
                  Export
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setExpandedPanel("integrations")}>
                  Expand
                </button>
              </div>
            </div>

            <div className="integration-stack">
              {integrations.map((service) => (
                <button
                  key={service.name}
                  type="button"
                  className="list-row inspectable-row"
                  onClick={() =>
                    setInspectRow({
                      title: service.name,
                      rows: [
                        ["Service", service.name],
                        ["Path", service.path],
                        ["Status", service.status],
                      ],
                    })
                  }
                >
                  <div>
                    <div className="integration-name">{service.name}</div>
                    <div className="integration-path">{service.path}</div>
                  </div>
                  <div className="integration-state">
                    <StatusDot status={integrationToneMap[service.status] ?? "degraded"} />
                    <Tag tone={integrationTagToneMap[service.status] ?? "default"}>
                      {service.status}
                    </Tag>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {expandedPanel ? (
        <div className="overlay-shell" onClick={() => setExpandedPanel(null)}>
          <div
            aria-describedby="expanded-panel-copy"
            aria-labelledby="expanded-panel-title"
            aria-modal="true"
            className="overlay-panel overlay-wide"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="overlay-head">
              <div>
                <div className="heading" id="expanded-panel-title">
                  {expandedMeta?.title}
                </div>
                <p className="panel-copy" id="expanded-panel-copy">
                  {expandedMeta?.description}
                </p>
              </div>
              <button
                aria-label={`Close ${expandedMeta?.title ?? "expanded panel"}`}
                className="btn btn-ghost btn-sm"
                onClick={() => setExpandedPanel(null)}
                type="button"
              >
                Close
              </button>
            </div>

            {expandedPanel === "sessions" ? (
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Session</th>
                      <th>Device</th>
                      <th>Screen</th>
                      <th>Status</th>
                      <th>Started</th>
                      <th>Ended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr
                        key={session.session_id}
                        onClick={() =>
                          setInspectRow({
                            title: `Session ${session.session_id.slice(0, 8)}`,
                            rows: [
                              ["Session ID", session.session_id],
                              ["Device", session.device_id],
                              ["Last screen", session.last_screen ?? "unknown"],
                              ["Status", session.dropped_off ? "Dropped off" : "Completed"],
                              ["Started", formatTime(session.start_time)],
                              ["Ended", formatTime(session.end_time)],
                            ],
                          })
                        }
                      >
                        <td>{session.session_id.slice(0, 8)}</td>
                        <td>{session.device_id}</td>
                        <td>{session.last_screen ?? "unknown"}</td>
                        <td>{session.dropped_off ? "Dropped off" : "Completed"}</td>
                        <td>{formatTime(session.start_time)}</td>
                        <td>{formatTime(session.end_time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {expandedPanel === "issues" ? (
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
                    {issues.map((issue) => (
                      <tr
                        key={issue.id}
                        onClick={() =>
                          setInspectRow({
                            title: issue.type.replace(/_/g, " "),
                            rows: [
                              ["Issue ID", issue.id],
                              ["Type", issue.type],
                              ["Screen", issue.screen ?? "unknown"],
                              ["Element", issue.element_id ?? "n/a"],
                              ["Frequency", String(issue.frequency)],
                              ["Affected users", String(issue.affected_users_count)],
                              ["Severity", issue.severity],
                            ],
                          })
                        }
                      >
                        <td>{issue.type.replace(/_/g, " ")}</td>
                        <td>{issue.screen ?? "unknown"}</td>
                        <td>{issue.frequency}</td>
                        <td>{issue.affected_users_count}</td>
                        <td>{issue.severity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {expandedPanel === "insights" ? (
              <div className="overlay-insight-grid">
                {insights.map((insight) => (
                  <button
                    type="button"
                    className="insight-card insight-button"
                    key={`${insight.issue_type}-${insight.screen}-${insight.title}-expanded`}
                    onClick={() =>
                      setInspectRow({
                        title: insight.title,
                        rows: [
                          ["Screen", insight.screen],
                          ["Issue", insight.issue_type],
                          ["Frequency", String(insight.frequency)],
                          ["Affected users", String(insight.affected_users_count)],
                          ["Impact", insight.impact],
                          ["Suggestions", insight.suggestions.join("; ") || "n/a"],
                        ],
                      })
                    }
                  >
                    <div className="insight-title">{insight.title}</div>
                    <div className="insight-body">{insight.impact}</div>
                    <div className="insight-footer">
                      <Tag>{insight.screen}</Tag>
                      <Tag tone="accent">{insight.frequency} events</Tag>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {expandedPanel === "integrations" ? (
              <div className="integration-stack">
                {integrations.map((service) => (
                  <button
                    key={`${service.name}-expanded`}
                    type="button"
                    className="list-row inspectable-row"
                    onClick={() =>
                      setInspectRow({
                        title: service.name,
                        rows: [
                          ["Service", service.name],
                          ["Path", service.path],
                          ["Status", service.status],
                        ],
                      })
                    }
                  >
                    <div>
                      <div className="integration-name">{service.name}</div>
                      <div className="integration-path">{service.path}</div>
                    </div>
                    <div className="integration-state">
                      <StatusDot status={integrationToneMap[service.status] ?? "degraded"} />
                      <Tag tone={integrationTagToneMap[service.status] ?? "default"}>
                        {service.status}
                      </Tag>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {inspectRow ? (
        <div className="overlay-shell" onClick={() => setInspectRow(null)}>
          <div
            aria-labelledby="inspect-row-title"
            aria-modal="true"
            className="overlay-panel overlay-narrow"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="overlay-head">
              <div className="heading" id="inspect-row-title">
                {inspectRow.title}
              </div>
              <button
                aria-label={`Close details for ${inspectRow.title}`}
                className="btn btn-ghost btn-sm"
                onClick={() => setInspectRow(null)}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="inspect-grid">
              {inspectRow.rows.map(([label, value]) => (
                <div className="inspect-row" key={`${inspectRow.title}-${label}`}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
