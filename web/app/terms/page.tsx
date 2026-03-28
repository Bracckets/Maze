import { SiteShell } from "@/components/site-shell";
import { Panel, Pill } from "@/components/ui";

export default function TermsPage() {
  return (
    <SiteShell eyebrow="Terms of service">
      <section className="legal-grid">
        <Panel glow>
          <Pill tone="light">Terms</Pill>
          <h1 className="page-title">Terms built for teams shipping fast.</h1>
          <p className="page-copy">
            These terms summarize how teams access Maze, manage their workspaces, and use the platform responsibly when processing
            product interaction data.
          </p>
        </Panel>
        <Panel>
          <Pill>Core obligations</Pill>
          <ul className="plan-features">
            <li>Use Maze only on products you are authorized to instrument.</li>
            <li>Do not send prohibited personal or financial data through event metadata.</li>
            <li>Keep workspace credentials and API keys secure.</li>
          </ul>
        </Panel>
      </section>

      <section className="content-grid">
        <Panel className="docs-list">
          <Pill>Service use</Pill>
          <article className="docs-item">
            <strong>Workspace access</strong>
            <p className="panel-copy">You are responsible for invited users, role assignments, and activity performed in your workspace.</p>
          </article>
          <article className="docs-item">
            <strong>Acceptable implementation</strong>
            <p className="panel-copy">Integrations must follow the SDK privacy guidance and must not attempt to bypass masking rules.</p>
          </article>
        </Panel>
        <Panel className="docs-list">
          <Pill tone="soft">Commercial terms</Pill>
          <article className="docs-item">
            <strong>Billing</strong>
            <p className="panel-copy">Paid plans renew according to the subscribed billing cadence unless canceled before renewal.</p>
          </article>
          <article className="docs-item">
            <strong>Availability</strong>
            <p className="panel-copy">Maze may introduce updates to improve performance, reliability, and detection accuracy over time.</p>
          </article>
        </Panel>
      </section>
    </SiteShell>
  );
}
