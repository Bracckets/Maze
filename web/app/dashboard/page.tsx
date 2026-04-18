import { DashboardWorkbench } from "@/components/dashboard-workbench";
import { DashboardShell } from "@/components/site-shell";
import { getIntegrationStatus } from "@/lib/service-gateway";
import { getInsights, getIssues, getSessions } from "@/lib/site-data";

export default async function DashboardPage() {
  const [insights, integrations, issues, sessions] = await Promise.all([
    getInsights(),
    getIntegrationStatus(),
    getIssues(),
    getSessions(),
  ]);

  return (
    <DashboardShell
      activePath="/dashboard"
      title="Dashboard"
      subtitle="Minimal enough to read at a glance, detailed enough to act without leaving the workspace."
    >
      <DashboardWorkbench
        insights={insights}
        issues={issues}
        sessions={sessions}
        integrations={integrations.services}
      />
    </DashboardShell>
  );
}
