"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type InsightDiscussionOption = {
  key: string;
  insight: Insight;
};

type InsightChatEvidence = {
  label: string;
  detail: string;
};

type InsightChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  evidence: InsightChatEvidence[];
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
  line: "var(--chart-line)",
  area: "var(--chart-area)",
  areaSecondary: "var(--chart-area-secondary)",
  bar: "var(--chart-bar)",
  barSoft: "var(--chart-bar-soft)",
  amber: "var(--chart-amber)",
  red: "var(--chart-red)",
  green: "var(--chart-green)",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
};

const issueLabelMap: Record<string, string> = {
  rage_tap: "Rage taps",
  drop_off: "Drop-offs",
  slow_response: "Slow response",
  dead_tap: "Dead taps",
  form_friction: "Form friction",
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

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatScreenLabel(screen: string | null | undefined) {
  if (!screen) {
    return "Unknown screen";
  }
  return screen.replace(/[_-]+/g, " ");
}

function getIssueLabel(issueType: string) {
  return issueLabelMap[issueType] ?? issueType.replace(/[_-]+/g, " ");
}

function getPrimarySuggestion(insight: Insight) {
  return insight.suggestions[0] ?? "Review the session evidence and tighten the target flow.";
}

function createInsightChatIntro(insight: Insight): InsightChatMessage {
  return {
    id: createMessageId(),
    role: "assistant",
    content: `I'm focused on ${getIssueLabel(insight.issue_type)} on ${formatScreenLabel(insight.screen)}. Ask why it is happening, what evidence supports it, or what to test first.`,
    evidence: [
      {
        label: "Focus issue",
        detail: `${insight.title} across ${insight.affected_users_count} affected users.`,
      },
    ],
  };
}

function buildInsightChatPrompts(insight: Insight) {
  const issueLabel = getIssueLabel(insight.issue_type);
  const screenLabel = formatScreenLabel(insight.screen);
  return [
    `Why is ${issueLabel} happening on ${screenLabel}?`,
    "What evidence supports this explanation?",
    "What should we test first to reduce this issue?",
  ];
}

export function DashboardWorkbench({
  insights,
  issues,
  sessions,
  integrations,
}: Props) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("charts");
  const [activeDataTab, setActiveDataTab] = useState<DataTab>("sessions");
  const chatThreadRef = useRef<HTMLDivElement | null>(null);

  const totalSessions = sessions.length;
  const dropOffs = sessions.filter((session) => session.dropped_off).length;
  const completionRate = totalSessions > 0 ? Math.round(((totalSessions - dropOffs) / totalSessions) * 100) : 0;
  const activeScreens = new Set(sessions.map((session) => session.last_screen).filter(Boolean)).size;
  const topIssue = issues[0];
  const insightDiscussionOptions = useMemo<InsightDiscussionOption[]>(
    () => insights.slice(0, 5).map((insight, index) => ({ key: getInsightKey(insight, index), insight })),
    [insights],
  );
  const [selectedInsightKey, setSelectedInsightKey] = useState<string | null>(insightDiscussionOptions[0]?.key ?? null);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<InsightChatMessage[]>(
    insightDiscussionOptions[0] ? [createInsightChatIntro(insightDiscussionOptions[0].insight)] : [],
  );
  const [chatError, setChatError] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const activeInsightOption = insightDiscussionOptions.find((option) => option.key === selectedInsightKey) ?? insightDiscussionOptions[0] ?? null;
  const activeChatPrompts = activeInsightOption ? buildInsightChatPrompts(activeInsightOption.insight) : [];

  useEffect(() => {
    if (insightDiscussionOptions.length === 0) {
      if (selectedInsightKey !== null) {
        setSelectedInsightKey(null);
      }
      if (chatMessages.length > 0) {
        setChatMessages([]);
      }
      return;
    }

    const hasSelection = selectedInsightKey
      ? insightDiscussionOptions.some((option) => option.key === selectedInsightKey)
      : false;
    if (hasSelection) {
      return;
    }

    const fallbackOption = insightDiscussionOptions[0];
    setSelectedInsightKey(fallbackOption.key);
    setChatMessages([createInsightChatIntro(fallbackOption.insight)]);
    setChatDraft("");
    setChatError(null);
  }, [insightDiscussionOptions, selectedInsightKey, chatMessages.length]);

  useEffect(() => {
    const thread = chatThreadRef.current;
    if (!thread) {
      return;
    }

    thread.scrollTo({
      top: thread.scrollHeight,
      behavior: chatMessages.length > 1 ? "smooth" : "auto",
    });
  }, [chatMessages, isChatLoading, selectedInsightKey]);

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

  const integrationCsv = useMemo(
    () =>
      toCsv(
        ["name", "path", "status"],
        integrations.map((integration) => [integration.name, integration.path, integration.status]),
      ),
    [integrations],
  );

  async function submitInsightChatQuestion(question: string) {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || !activeInsightOption || isChatLoading) {
      return;
    }

    const history = chatMessages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const userMessage: InsightChatMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmedQuestion,
      evidence: [],
    };
    const nextMessages = [...chatMessages, userMessage];

    setChatMessages(nextMessages);
    setChatDraft("");
    setChatError(null);
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/insights/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          focus: {
            title: activeInsightOption.insight.title,
            screen: activeInsightOption.insight.screen,
            issue_type: activeInsightOption.insight.issue_type,
          },
          history,
        }),
      });

      const payload = (await response.json()) as {
        answer?: string;
        evidence?: InsightChatEvidence[];
        error?: string;
      };

      if (!response.ok || !payload.answer) {
        throw new Error(payload.error ?? "Unable to discuss this issue right now.");
      }

      setChatMessages([
        ...nextMessages,
        {
          id: createMessageId(),
          role: "assistant",
          content: payload.answer,
          evidence: payload.evidence ?? [],
        },
      ]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Unable to discuss this issue right now.");
      setChatMessages(nextMessages);
    } finally {
      setIsChatLoading(false);
    }
  }

  function handleInsightFocusSelect(option: InsightDiscussionOption) {
    setSelectedInsightKey(option.key);
    setChatMessages([createInsightChatIntro(option.insight)]);
    setChatDraft("");
    setChatError(null);
  }

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

      <div className="pollex-dashboard-stage">
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
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--chart-cursor-stroke)" }} />
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
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--chart-cursor-fill)" }} />
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
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--chart-cursor-fill)" }} />
                  <Bar dataKey="value" name="Sessions" radius={[10, 10, 0, 0]} fill={chartPalette.bar} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="pollex-surface pollex-surface-fill-right">
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
                      stroke="var(--chart-separator)"
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
          <section className="pollex-insights-workspace">
            <div className="pollex-insights-chat-stage">
              {activeInsightOption ? (
                <div className="pollex-insight-chat">
                  <div className="pollex-insight-chat-hero">
                    <div className="pollex-insight-chat-copy">
                      <span className="eyebrow">Model context protocol</span>
                      <h2 className="heading">Issue discussion</h2>
                      <p className="panel-copy">Ask about likely causes, supporting evidence, and what to test next. Replies stay grounded in the selected insight, related issue severity, and recent workspace sessions.</p>
                    </div>
                    <div className="pollex-insight-chat-hero-tags">
                      <Tag tone={issueToneMap[activeInsightOption.insight.issue_type] ?? "default"}>
                        {getIssueLabel(activeInsightOption.insight.issue_type)}
                      </Tag>
                      <Tag>{formatScreenLabel(activeInsightOption.insight.screen)}</Tag>
                    </div>
                  </div>

                  <div className="pollex-insight-chat-meta">
                    <span>MCP context packet is attached</span>
                    <span>{chatMessages.length} messages in this thread</span>
                    <span>{activeInsightOption.insight.affected_users_count} impacted users</span>
                  </div>

                  <div className="pollex-chat-thread" ref={chatThreadRef}>
                    <div className="pollex-chat-thread-break">Today</div>
                    {chatMessages.map((message) => (
                      <article className={`pollex-chat-message pollex-chat-message-${message.role}`.trim()} key={message.id}>
                        <div className={`pollex-chat-avatar pollex-chat-avatar-${message.role}`.trim()}>
                          {message.role === "assistant" ? "AI" : "You"}
                        </div>
                        <div className="pollex-chat-message-body">
                          <div className="pollex-chat-bubble-top">
                            <strong>{message.role === "assistant" ? "Context analyst" : "You"}</strong>
                            <span>{message.role === "assistant" ? "Grounded answer" : "Question"}</span>
                          </div>
                          <div className={`pollex-chat-bubble pollex-chat-bubble-${message.role}`.trim()}>
                            <p>{message.content}</p>
                            {message.evidence.length > 0 ? (
                              <div className="pollex-chat-evidence">
                                {message.evidence.map((item) => (
                                  <div className="pollex-chat-evidence-item" key={`${message.id}-${item.label}`}>
                                    <strong>{item.label}</strong>
                                    <span>{item.detail}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                    {isChatLoading ? (
                      <article className="pollex-chat-message pollex-chat-message-assistant pollex-chat-bubble-loading">
                        <div className="pollex-chat-avatar pollex-chat-avatar-assistant">AI</div>
                        <div className="pollex-chat-message-body">
                          <div className="pollex-chat-bubble-top">
                            <strong>Context analyst</strong>
                            <span>Thinking</span>
                          </div>
                          <div className="pollex-chat-bubble pollex-chat-bubble-assistant">
                            <p>Reviewing the current issue snapshot, related sessions, and workspace evidence.</p>
                          </div>
                        </div>
                      </article>
                    ) : null}
                  </div>

                  <div className="pollex-chat-prompt-row">
                    {activeChatPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="pollex-chat-prompt"
                        onClick={() => void submitInsightChatQuestion(prompt)}
                        disabled={isChatLoading}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  <form
                    className="pollex-chat-compose"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitInsightChatQuestion(chatDraft);
                    }}
                  >
                    <div className="pollex-chat-compose-shell">
                      <textarea
                        className="pollex-chat-input"
                        rows={3}
                        value={chatDraft}
                        onChange={(event) => setChatDraft(event.target.value)}
                        placeholder={`Ask about ${activeInsightOption.insight.title.toLowerCase()}...`}
                      />
                      <div className="pollex-chat-compose-actions">
                        <span className={`pollex-chat-status ${chatError ? "pollex-chat-status-error" : ""}`.trim()}>
                          {chatError ?? "Ask about causes, confidence, or what to test next."}
                        </span>
                        <button
                          className="pollex-chat-send"
                          type="submit"
                          aria-label={isChatLoading ? "Thinking" : "Send message"}
                          disabled={isChatLoading || !chatDraft.trim()}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 12 20 4l-4.5 16-3.2-5.3L4 12Z" />
                            <path d="M11.8 14.7 20 4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="pollex-insight-chat pollex-insight-chat-empty">
                  <p className="empty-copy">Issue discussion will become available once Pollex has insights to analyze.</p>
                </div>
              )}
            </div>

            <aside className="pollex-insights-rail">
              <div className="pollex-insights-rail-head">
                <span className="eyebrow">Investigation workspace</span>
                <h2 className="heading">Keep the active issue in view while you chat</h2>
                <p className="panel-copy">Use the right rail to switch friction threads and inspect the evidence behind the current conversation.</p>
              </div>

              {activeInsightOption ? (
                <>
                  <div className="pollex-insight-focus-list" role="tablist" aria-label="Issues to discuss">
                    {insightDiscussionOptions.map((option, index) => (
                      <button
                        key={option.key}
                        type="button"
                        role="tab"
                        aria-selected={activeInsightOption.key === option.key}
                        className={`pollex-chat-focus-chip ${activeInsightOption.key === option.key ? "active" : ""}`.trim()}
                        onClick={() => handleInsightFocusSelect(option)}
                      >
                        <div className="pollex-chat-focus-chip-topline">
                          <span className="pollex-chat-focus-rank">{String(index + 1).padStart(2, "0")}</span>
                          <Tag tone={issueToneMap[option.insight.issue_type] ?? "default"}>{getIssueLabel(option.insight.issue_type)}</Tag>
                        </div>
                        <strong>{option.insight.title}</strong>
                        <span>{formatScreenLabel(option.insight.screen)}</span>
                      </button>
                    ))}
                  </div>

                  <section className="pollex-insight-context-panel">
                    <div className="pollex-insight-context-head">
                      <div>
                        <span className="eyebrow">Selected issue</span>
                        <h3>{activeInsightOption.insight.title}</h3>
                      </div>
                      <Tag tone={issueToneMap[activeInsightOption.insight.issue_type] ?? "default"}>
                        {formatScreenLabel(activeInsightOption.insight.screen)}
                      </Tag>
                    </div>
                    <p>{activeInsightOption.insight.impact}</p>
                    <div className="pollex-insight-context-metrics">
                      <div>
                        <span>Signal volume</span>
                        <strong>{activeInsightOption.insight.frequency}</strong>
                      </div>
                      <div>
                        <span>Affected users</span>
                        <strong>{activeInsightOption.insight.affected_users_count}</strong>
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                <p className="empty-copy">Issue discussion will become available once Pollex has insights to analyze.</p>
              )}
            </aside>
          </section>
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
      </div>
    </section>
  );
}
