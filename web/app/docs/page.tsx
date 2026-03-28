import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { Panel, Pill } from "@/components/ui";

const docs = [
  {
    title: "Install the SDK",
    copy: "Add the Maze package, initialize it at app launch, and verify ingestion succeeds before instrumenting more screens."
  },
  {
    title: "Track onboarding screens",
    copy: "Start with welcome, authentication, verification, and KYC flows to create the most valuable behavior baseline."
  },
  {
    title: "Protect sensitive values",
    copy: "Mask passwords, OTP values, payment details, and any national ID fields before they leave the device."
  }
];

export default function DocsPage() {
  return (
    <SiteShell eyebrow="Product docs">
      <section className="hero-grid">
        <div className="hero-copy">
          <h1 className="page-title">
            Docs that hand your team
            <br />
            <span className="gradient-text">a fast start.</span>
          </h1>
          <p className="page-copy">
            Maze is meant to be understandable by humans and executable by coding agents. Start with integration, then layer on
            better screen and tap coverage.
          </p>
          <div className="button-row">
            <Link className="button primary" href="/signin">
              Open workspace
            </Link>
            <Link className="button ghost" href="/pricing">
              Compare plans
            </Link>
          </div>
        </div>

        <Panel glow>
          <Pill tone="light">Recommended flow</Pill>
          <div className="step-list">
            <div className="step-pill primary">Sign in to Maze</div>
            <div className="step-pill">Give your coding agent MAZE_INTEGRATION.md</div>
            <div className="step-pill accent">Watch the Maze unfold</div>
          </div>
        </Panel>
      </section>

      <section className="docs-grid">
        {docs.map((doc) => (
          <Panel className="docs-item" key={doc.title}>
            <Pill>{doc.title}</Pill>
            <strong>{doc.title}</strong>
            <p className="panel-copy">{doc.copy}</p>
          </Panel>
        ))}
        <Panel className="docs-item">
          <Pill tone="light">API surface</Pill>
          <strong>Integration-ready routes</strong>
          <p className="panel-copy">POST `/api/auth/signin`, GET/POST `/api/workspace/api-keys`, GET/PUT `/api/workspace/settings`.</p>
        </Panel>
        <Panel className="docs-item">
          <Pill tone="soft">Environment variables</Pill>
          <strong>Swap mock services without UI changes</strong>
          <p className="panel-copy">
            Set `MAZE_AUTH_SERVICE_URL`, `MAZE_API_KEYS_SERVICE_URL`, `MAZE_WORKSPACE_SERVICE_URL`, and `MAZE_INTEGRATIONS_SERVICE_URL`.
          </p>
        </Panel>
      </section>
    </SiteShell>
  );
}
