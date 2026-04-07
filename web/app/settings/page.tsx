import { ApiKeyManager } from "@/components/api-key-manager";
import { DashboardShell } from "@/components/site-shell";
import { Card, StatusDot, Tag } from "@/components/ui";
import { WorkspaceSettingsEditor } from "@/components/workspace-settings-editor";
import { getRequestLocale } from "@/lib/i18n-server";
import { getIntegrationStatus, getWorkspaceSettings } from "@/lib/service-gateway";

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

export default async function SettingsPage() {
  const locale = await getRequestLocale();
  const settings = await getWorkspaceSettings();
  const integrations = await getIntegrationStatus();
  const workspaceSettings = "detail" in settings
    ? null
    : (settings as {
        workspaceId: string;
        workspaceName: string;
        apiBaseUrl: string;
        authProvider: string;
        ingestionMode: string;
        masking: string;
        planId?: string | null;
        planName?: string | null;
      });
  const apiBaseUrl = workspaceSettings?.apiBaseUrl ?? (locale === "ar" ? "سجّل الدخول لتحميل الإعدادات" : "Sign in to load settings");

  return (
    <DashboardShell
      title={locale === "ar" ? "الإعدادات" : "Settings"}
      subtitle={locale === "ar" ? "أدر إعدادات الحزمة ومفاتيح API واتصالات الخدمات." : "Manage your SDK configuration, API keys, and service connections."}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <Card>
            <div className="heading" style={{ marginBottom: 4 }}>{locale === "ar" ? "إعدادات الحزمة" : "SDK configuration"}</div>
            <p className="subtext" style={{ fontSize: "0.85rem", marginBottom: 20 }}>
              {locale === "ar" ? "استخدم هذه القيم عند تهيئة حزمة Maze داخل تطبيق الجوال." : "Use these values when initializing the Maze SDK in your mobile app."}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              <Tag tone="green">{workspaceSettings?.planName ?? (locale === "ar" ? "لا توجد باقة نشطة" : "No active plan")}</Tag>
              <Tag>{workspaceSettings?.workspaceName ?? (locale === "ar" ? "مساحة العمل" : "Workspace")}</Tag>
            </div>

            <WorkspaceSettingsEditor
              initialSettings={workspaceSettings ? {
                apiBaseUrl: workspaceSettings.apiBaseUrl,
                authProvider: workspaceSettings.authProvider,
                ingestionMode: workspaceSettings.ingestionMode,
                masking: workspaceSettings.masking,
              } : {
                apiBaseUrl,
                authProvider: "maze-backend",
                ingestionMode: "batched",
                masking: "strict",
              }}
            />
            <div className="field">
              <label>{locale === "ar" ? "مفتاح مساحة العمل" : "Workspace key"}</label>
              <input readOnly value={locale === "ar" ? "استخدم مفتاح API المولد أدناه" : "Use a generated API key below"} />
              <p className="field-hint" style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: 4 }}>
                {locale === "ar" ? "ولّد مفتاحاً في قسم مفاتيح API واستخدمه في تهيئة الحزمة." : "Generate a key in the API Keys section and use it in your SDK initialization."}
              </p>
            </div>
          </Card>

          <Card>
            <div className="heading" style={{ marginBottom: 4 }}>{locale === "ar" ? "اتصالات الخدمات" : "Service connections"}</div>
            <p className="subtext" style={{ fontSize: "0.85rem", marginBottom: 18 }}>
              {locale === "ar" ? "هذه المسارات تعتمد على خلفية Maze والجلسة الحالية لمساحة العمل." : "These routes are backed by your Maze backend and current workspace session."}
            </p>

            {integrations.services.map((service) => (
              <div className="list-row" key={service.name}>
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                    {service.name}
                  </div>
                  <code style={{ fontSize: "0.76rem" }}>{service.path}</code>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <StatusDot status={integrationToneMap[service.status] ?? "degraded"} />
                  <Tag tone={integrationTagToneMap[service.status] ?? "default"}>{service.status}</Tag>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <Card accent>
          <div className="heading" style={{ marginBottom: 4 }}>API keys</div>
          <p className="subtext" style={{ fontSize: "0.85rem", marginBottom: 20 }}>
            {locale === "ar" ? "ولّد مفاتيح لمصادقة حزمة الجوال وتكاملات الخلفية. تُعرض المفاتيح مرة واحدة فقط، لذا خزّنها بأمان." : "Generate keys to authenticate your mobile SDK and backend integrations. Keys are shown once, so store them securely."}
          </p>
          <ApiKeyManager />
        </Card>
      </div>
    </DashboardShell>
  );
}
