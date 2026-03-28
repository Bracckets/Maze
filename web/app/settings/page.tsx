import { ApiKeyManager } from "@/components/api-key-manager";
import { DashboardShell } from "@/components/site-shell";
import { Panel, Pill } from "@/components/ui";
import { getIntegrationStatus, getWorkspaceSettings } from "@/lib/service-gateway";

export default async function SettingsPage() {
  const settings = await getWorkspaceSettings();
  const integrations = await getIntegrationStatus();

  return (
    <DashboardShell
      aside={
        <Panel>
          <Pill tone="soft">Workspace status</Pill>
          <strong className="metric-value">MVP</strong>
          <p className="panel-copy">The app now exposes internal API routes that can proxy to external auth, key, and settings services.</p>
        </Panel>
      }
      subtitle="Control the way Maze captures, routes, and safeguards behavioral data."
      title="Settings"
    >
      <section className="settings-grid">
        <Panel glow>
          <Pill>SDK configuration</Pill>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="api-key">Workspace API key</label>
              <input id="api-key" readOnly value="Use generated backend ingestion keys below" />
            </div>
            <div className="field">
              <label htmlFor="sampling">Ingestion API</label>
              <input id="sampling" readOnly value={settings.apiBaseUrl} />
            </div>
            <div className="field">
              <label htmlFor="masking">Sensitive-field policy</label>
              <textarea defaultValue="Mask passwords, card numbers, national IDs, OTP values, and banking identifiers before transport." id="masking" />
            </div>
          </div>
        </Panel>

        <div className="stack">
          <Panel glow>
            <Pill tone="light">API keys</Pill>
            <ApiKeyManager />
          </Panel>

          <Panel>
            <Pill>Service connections</Pill>
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
          </Panel>
        </div>
      </section>
    </DashboardShell>
  );
}
