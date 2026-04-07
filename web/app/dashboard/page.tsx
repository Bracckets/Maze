import { DashboardWorkbench } from "@/components/dashboard-workbench";
import { DashboardShell } from "@/components/site-shell";
import { getRequestLocale } from "@/lib/i18n-server";
import { getIntegrationStatus } from "@/lib/service-gateway";
import { getInsights, getIssues, getSessions } from "@/lib/site-data";

export default async function DashboardPage() {
  const locale = await getRequestLocale();
  const [insights, integrations, issues, sessions] = await Promise.all([
    getInsights(),
    getIntegrationStatus(),
    getIssues(),
    getSessions(),
  ]);

  return (
    <DashboardShell
      title={locale === "ar" ? "مركز التحكم" : "Command center"}
      subtitle={locale === "ar" ? "سطح تشغيل سريع الاستجابة لسلوك المستخدم والاحتكاك وصحة التتبع." : "A responsive operating surface for live behavior, friction, and instrumentation health."}
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
