import { SiteShell } from "@/components/site-shell";
import { Panel, Pill } from "@/components/ui";

export default function PrivacyPage() {
  return (
    <SiteShell eyebrow="Privacy policy">
      <section className="legal-grid">
        <Panel glow>
          <Pill tone="soft">Privacy policy</Pill>
          <h1 className="page-title">Privacy that respects the signal.</h1>
          <p className="page-copy">
            Maze is designed to help teams understand product friction without capturing the private contents of users’ identities,
            credentials, or financial details.
          </p>
        </Panel>
        <Panel>
          <Pill>At a glance</Pill>
          <ul className="plan-features">
            <li>We collect product interaction events, not raw secrets.</li>
            <li>Passwords, OTP values, payment details, and national IDs must be masked or omitted.</li>
            <li>Workspace administrators control retention and alert routing.</li>
          </ul>
        </Panel>
      </section>

      <section className="content-grid">
        <Panel className="docs-list">
          <Pill>What we collect</Pill>
          <article className="docs-item">
            <strong>Behavioral metadata</strong>
            <p className="panel-copy">Screen names, event names, timestamps, element identifiers, and aggregate interaction patterns.</p>
          </article>
          <article className="docs-item">
            <strong>Operational telemetry</strong>
            <p className="panel-copy">Delivery status, SDK version, and ingestion performance needed to keep the service reliable.</p>
          </article>
        </Panel>
        <Panel className="docs-list">
          <Pill tone="light">What we do not collect</Pill>
          <article className="docs-item">
            <strong>Raw secrets or regulated fields</strong>
            <p className="panel-copy">Maze should never receive passwords, card numbers, bank identifiers, or government ID numbers.</p>
          </article>
          <article className="docs-item">
            <strong>More data than necessary</strong>
            <p className="panel-copy">The SDK is intended for targeted instrumentation, not indiscriminate full-screen capture.</p>
          </article>
        </Panel>
      </section>
    </SiteShell>
  );
}
