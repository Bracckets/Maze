import Link from "next/link";

import { DashboardShell } from "@/components/site-shell";
import { Panel, Pill } from "@/components/ui";
import { getIntegrationStatus } from "@/lib/service-gateway";
import { getInsights } from "@/lib/site-data";

const funnel = [
  { stage: "Welcome", value: 100 },
  { stage: "Phone input", value: 82 },
  { stage: "OTP verification", value: 67 },
  { stage: "KYC form", value: 44 },
  { stage: "Approved", value: 31 }
];

const sessions = [
  { id: "s_1041", screen: "kyc_form", friction: "rage taps", time: "11:42", users: "14" },
  { id: "s_1032", screen: "otp_verification", friction: "slow response", time: "11:17", users: "9" },
  { id: "s_1028", screen: "welcome", friction: "dead taps", time: "10:58", users: "4" },
  { id: "s_1022", screen: "kyc_form", friction: "drop-off", time: "10:46", users: "28" }
];

export default async function DashboardPage() {
  const insights = await getInsights();
  const integrations = await getIntegrationStatus();

  return (
    <DashboardShell
      aside={
        <Panel>
          <Pill tone="light">Realtime</Pill>
          <strong className="metric-value">92.4%</strong>
          <p className="panel-copy">Tracker delivery success across the last 24 hours of mobile session uploads.</p>
        </Panel>
      }
      subtitle="Track user behavior across onboarding, spot friction before it becomes churn, and route fixes back to product and engineering."
      title="Behavior dashboard"
    >
      <section className="dashboard-layout">
        <div className="stack">
          <Panel glow>
            <Pill tone="soft">Onboarding funnel</Pill>
            <h2 className="section-title">Where users fade out.</h2>
            <div className="funnel">
              {funnel.map((item) => (
                <div className="funnel-row" key={item.stage}>
                  <header>
                    <span>{item.stage}</span>
                    <span>{item.value}%</span>
                  </header>
                  <div className="funnel-track">
                    <div className="funnel-fill" style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <Pill>Recent critical sessions</Pill>
            <table className="session-table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Last screen</th>
                  <th>Issue</th>
                  <th>Users</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.screen}</td>
                    <td>{row.friction}</td>
                    <td>{row.users}</td>
                    <td>{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="stack">
          <Panel glow>
            <Pill tone="light">Top insights</Pill>
            <div className="issue-list">
              {insights.length > 0 ? (
                insights.map((insight) => (
                  <article className="issue-item" key={`${insight.issue_type}-${insight.screen}-${insight.element_id}`}>
                    <strong>{insight.title}</strong>
                    <p className="panel-copy">{insight.impact}</p>
                    <div className="issue-meta">
                      <Pill>{insight.screen}</Pill>
                      <Pill tone="soft">{insight.frequency} events</Pill>
                    </div>
                  </article>
                ))
              ) : (
                <article className="issue-item">
                  <strong>Backend unavailable</strong>
                  <p className="panel-copy">Start the FastAPI service to pull live insights into the dashboard cards.</p>
                </article>
              )}
            </div>
          </Panel>

          <Panel>
            <Pill>Integration readiness</Pill>
            <div className="clean-list">
              {integrations.services.map((service) => (
                <article className="clean-item" key={service.name}>
                  <div>
                    <strong>{service.name}</strong>
                    <p className="panel-copy">{service.path}</p>
                  </div>
                  <span className="inline-note">{service.status}</span>
                </article>
              ))}
            </div>
            <div className="button-row">
              <Link className="button ghost" href="/settings">
                Manage keys
              </Link>
            </div>
          </Panel>
        </div>
      </section>
    </DashboardShell>
  );
}
