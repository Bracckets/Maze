import { ApiKeyManager } from "@/components/api-key-manager";
import { DashboardShell } from "@/components/site-shell";
import { Card, StatusDot, Tag } from "@/components/ui";
import { getIntegrationStatus, getWorkspaceSettings } from "@/lib/service-gateway";

export default async function SettingsPage() {
  const settings = await getWorkspaceSettings();
  const integrations = await getIntegrationStatus();

  return (
    <DashboardShell
      title="Settings"
      subtitle="Manage your SDK configuration, API keys, and service connections."
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>

        {/* SDK config */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <Card>
            <div className="heading" style={{ marginBottom: 4 }}>SDK configuration</div>
            <p className="subtext" style={{ fontSize: "0.85rem", marginBottom: 20 }}>
              Use these values when initializing the Maze SDK in your mobile app.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label>Ingestion endpoint</label>
                <input readOnly value={settings.apiBaseUrl} />
              </div>
              <div className="field">
                <label>Workspace key</label>
                <input readOnly value="Use a generated API key below" />
                <p className="field-hint" style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: 4 }}>
                  Generate a key in the API Keys section and use it in your SDK initialization.
                </p>
              </div>
              <div className="field">
                <label>Data masking rules</label>
                <textarea
                  defaultValue="Mask passwords, card numbers, national IDs, OTP codes, and bank account details before sending."
                  rows={3}
                />
                <p className="field-hint" style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: 4 }}>
                  These fields are stripped on-device before any data leaves the user's phone.
                </p>
              </div>
            </div>
          </Card>

          {/* Service connections */}
          <Card>
            <div className="heading" style={{ marginBottom: 4 }}>Service connections</div>
            <p className="subtext" style={{ fontSize: "0.85rem", marginBottom: 18 }}>
              Point these to your own backends via environment variables.
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
                  <StatusDot status={service.status === "ready" ? "online" : "degraded"} />
                  <Tag tone={service.status === "ready" ? "green" : "amber"}>{service.status}</Tag>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* API keys */}
        <Card accent>
          <div className="heading" style={{ marginBottom: 4 }}>API keys</div>
          <p className="subtext" style={{ fontSize: "0.85rem", marginBottom: 20 }}>
            Generate keys to authenticate your mobile SDK and backend integrations.
            Keys are shown once — store them securely.
          </p>
          <ApiKeyManager />
        </Card>

      </div>
    </DashboardShell>
  );
}
