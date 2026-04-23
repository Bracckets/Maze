import { ApiKeyManager } from "@/components/api-key-manager";
import { DashboardShell } from "@/components/site-shell";
import { PollexAppIcon } from "@/components/pollex-app-icon";
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
  const workspaceSettings =
    "detail" in settings
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
  const apiBaseUrl = workspaceSettings?.apiBaseUrl ?? (locale === "ar" ? "ط·آ³ط·آ¬ط¸â€کط¸â€‍ ط·آ§ط¸â€‍ط·آ¯ط·آ®ط¸ث†ط¸â€‍ ط¸â€‍ط·ع¾ط·آ­ط¸â€¦ط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط·آ¥ط·آ¹ط·آ¯ط·آ§ط·آ¯ط·آ§ط·ع¾" : "Sign in to load settings");

  return (
    <DashboardShell
      activePath="/settings"
      title={locale === "ar" ? "ط·آ§ط¸â€‍ط·آ¥ط·آ¹ط·آ¯ط·آ§ط·آ¯ط·آ§ط·ع¾" : "Settings"}
      subtitle={locale === "ar" ? "ط·آ£ط·آ¯ط·آ± ط·آ¥ط·آ¹ط·آ¯ط·آ§ط·آ¯ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ­ط·آ²ط¸â€¦ط·آ© ط¸ث†ط¸â€¦ط¸ظ¾ط·آ§ط·ع¾ط¸ظ¹ط·آ­ API ط¸ث†ط·آ§ط·ع¾ط·آµط·آ§ط¸â€‍ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ®ط·آ¯ط¸â€¦ط·آ§ط·ع¾." : "Manage your SDK configuration, API keys, and service connections."}
    >
      <div className="pollex-account-grid">
        <div className="pollex-account-stack">
          <Card>
            <div className="pollex-section-heading" style={{ marginBottom: 4 }}>
              <span className="pollex-section-heading-icon" aria-hidden="true">
                <PollexAppIcon icon="settings" />
              </span>
              <div className="heading">{locale === "ar" ? "ط·آ¥ط·آ¹ط·آ¯ط·آ§ط·آ¯ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ­ط·آ²ط¸â€¦ط·آ©" : "SDK configuration"}</div>
            </div>
            <p className="pollex-panel-intro">
              {locale === "ar" ? "ط·آ§ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ ط¸â€،ط·آ°ط¸â€، ط·آ§ط¸â€‍ط¸â€ڑط¸ظ¹ط¸â€¦ ط·آ¹ط¸â€ ط·آ¯ ط·ع¾ط¸â€،ط¸ظ¹ط·آ¦ط·آ© ط·آ­ط·آ²ط¸â€¦ط·آ© Pollex ط·آ¯ط·آ§ط·آ®ط¸â€‍ ط·ع¾ط·آ·ط·آ¨ط¸ظ¹ط¸â€ڑ ط·آ§ط¸â€‍ط·آ¬ط¸ث†ط·آ§ط¸â€‍." : "Use these values when initializing the Pollex SDK in your mobile app."}
            </p>
            <div className="pollex-inline-tags" style={{ marginBottom: 18 }}>
              <Tag tone="green">{workspaceSettings?.planName ?? (locale === "ar" ? "ط¸â€‍ط·آ§ ط·ع¾ط¸ث†ط·آ¬ط·آ¯ ط·آ¨ط·آ§ط¸â€ڑط·آ© ط¸â€ ط·آ´ط·آ·ط·آ©" : "No active plan")}</Tag>
              <Tag>{workspaceSettings?.workspaceName ?? (locale === "ar" ? "ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ© ط·آ§ط¸â€‍ط·آ¹ط¸â€¦ط¸â€‍" : "Workspace")}</Tag>
            </div>

            <WorkspaceSettingsEditor
              initialSettings={
                workspaceSettings
                  ? {
                      apiBaseUrl: workspaceSettings.apiBaseUrl,
                      authProvider: workspaceSettings.authProvider,
                      ingestionMode: workspaceSettings.ingestionMode,
                      masking: workspaceSettings.masking,
                    }
                  : {
                      apiBaseUrl,
                      authProvider: "maze-backend",
                      ingestionMode: "batched",
                      masking: "strict",
                    }
              }
            />
            <div className="field">
              <label>{locale === "ar" ? "ط¸â€¦ط¸ظ¾ط·ع¾ط·آ§ط·آ­ ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ© ط·آ§ط¸â€‍ط·آ¹ط¸â€¦ط¸â€‍" : "Workspace key"}</label>
              <input readOnly value={locale === "ar" ? "ط·آ§ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ ط¸â€¦ط¸ظ¾ط·ع¾ط·آ§ط·آ­ API ط·آ§ط¸â€‍ط¸â€¦ط¸ث†ط¸â€‍ط·آ¯ ط·آ£ط·آ¯ط¸â€ ط·آ§ط¸â€،" : "Use a generated API key below"} />
              <p className="pollex-form-note">
                {locale === "ar"
                  ? "ط¸ث†ط¸â€‍ط¸â€کط·آ¯ ط¸â€¦ط¸ظ¾ط·ع¾ط·آ§ط·آ­ط¸â€¹ط·آ§ ط¸ظ¾ط¸ظ¹ ط¸â€ڑط·آ³ط¸â€¦ ط¸â€¦ط¸ظ¾ط·آ§ط·ع¾ط¸ظ¹ط·آ­ API ط¸ث†ط·آ§ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ط¸â€، ط¸ظ¾ط¸ظ¹ ط·ع¾ط¸â€،ط¸ظ¹ط·آ¦ط·آ© ط·آ§ط¸â€‍ط·آ­ط·آ²ط¸â€¦ط·آ©."
                  : "Generate a key in the API Keys section and use it in your SDK initialization."}
              </p>
            </div>
          </Card>

          <Card>
            <div className="pollex-section-heading" style={{ marginBottom: 4 }}>
              <span className="pollex-section-heading-icon" aria-hidden="true">
                <PollexAppIcon icon="connection" />
              </span>
              <div className="heading">{locale === "ar" ? "ط·آ§ط·ع¾ط·آµط·آ§ط¸â€‍ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ®ط·آ¯ط¸â€¦ط·آ§ط·ع¾" : "Service connections"}</div>
            </div>
            <p className="pollex-panel-intro">
              {locale === "ar"
                ? "ط¸â€،ط·آ°ط¸â€، ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·آ§ط·آ±ط·آ§ط·ع¾ ط·ع¾ط·آ¹ط·ع¾ط¸â€¦ط·آ¯ ط·آ¹ط¸â€‍ط¸â€° ط·آ®ط¸â€‍ط¸ظ¾ط¸ظ¹ط·آ© Pollex ط¸ث†ط·آ§ط¸â€‍ط·آ¬ط¸â€‍ط·آ³ط·آ© ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط¸ظ¹ط·آ© ط¸â€‍ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ© ط·آ§ط¸â€‍ط·آ¹ط¸â€¦ط¸â€‍."
                : "These routes are backed by your Pollex backend and current workspace session."}
            </p>

            <div className="pollex-ranked-list">
              {integrations.services.map((service) => (
                <div className="list-row" key={service.name}>
                  <div className="pollex-list-row-main">
                    <span className="pollex-list-row-icon" aria-hidden="true">
                      <PollexAppIcon icon="connection" />
                    </span>
                    <div>
                      <div className="pollex-service-name">{service.name}</div>
                      <code className="pollex-service-path">{service.path}</code>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <StatusDot status={integrationToneMap[service.status] ?? "degraded"} />
                    <Tag tone={integrationTagToneMap[service.status] ?? "default"}>{service.status}</Tag>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card accent>
          <div className="pollex-section-heading" style={{ marginBottom: 4 }}>
            <span className="pollex-section-heading-icon" aria-hidden="true">
              <PollexAppIcon icon="key" />
            </span>
            <div className="heading">API keys</div>
          </div>
          <p className="pollex-panel-intro">
            {locale === "ar"
              ? "ط¸ث†ط¸â€‍ط¸â€کط·آ¯ ط¸â€¦ط¸ظ¾ط·آ§ط·ع¾ط¸ظ¹ط·آ­ ط¸â€‍ط¸â€¦ط·آµط·آ§ط·آ¯ط¸â€ڑط·آ© ط·آ­ط·آ²ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط·آ¬ط¸ث†ط·آ§ط¸â€‍ ط¸ث†ط·ع¾ط¸ئ’ط·آ§ط¸â€¦ط¸â€‍ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ®ط¸â€‍ط¸ظ¾ط¸ظ¹ط·آ©. ط·ع¾ط¸عˆط·آ¹ط·آ±ط·آ¶ ط·آ§ط¸â€‍ط¸â€¦ط¸ظ¾ط·آ§ط·ع¾ط¸ظ¹ط·آ­ ط¸â€¦ط·آ±ط·آ© ط¸ث†ط·آ§ط·آ­ط·آ¯ط·آ© ط¸ظ¾ط¸â€ڑط·آ·ط·إ’ ط¸â€‍ط·آ°ط·آ§ ط·آ®ط·آ²ط¸â€کط¸â€ ط¸â€،ط·آ§ ط·آ¨ط·آ£ط¸â€¦ط·آ§ط¸â€ ."
              : "Generate keys to authenticate your mobile SDK and backend integrations. Keys are shown once, so store them securely."}
          </p>
          <ApiKeyManager />
        </Card>
      </div>
    </DashboardShell>
  );
}
