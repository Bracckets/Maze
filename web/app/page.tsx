import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { MetricCard, Panel, Pill } from "@/components/ui";
import { heroStats } from "@/lib/site-data";

export default function HomePage() {
  return (
    <SiteShell eyebrow="Maze MVP">
      <section className="hero-grid">
        <div className="hero-copy">
          <h1 className="hero-title">
            Product intelligence
            <br />
            <span className="gradient-text">with easy integration.</span>
          </h1>
          <p className="hero-subcopy">
            Maze helps product teams capture behavioral signals, explain friction, and plug cleanly into auth, backend, and workspace
            services without redesigning the front end.
          </p>
          <div className="button-row">
            <Link className="button primary" href="/signin">
              Sign in to Maze
            </Link>
            <Link className="button secondary" href="/dashboard">
              Open dashboard
            </Link>
          </div>
        </div>

        <Panel glow>
          <div className="stack">
            <Pill tone="light">MVP upgrade</Pill>
            <h2 className="section-title">Clean analytics UI, real product surfaces, and a service-ready foundation.</h2>
            <p className="panel-copy">
              The site now supports sign-in API flows, API key generation, backend endpoint exposure, and service proxying through
              internal Next.js route handlers.
            </p>
            {heroStats.map((item) => (
              <div className="hero-metric" key={item.label}>
                <span className="mini-label">{item.label}</span>
                <strong>{item.value}</strong>
                <span className="metric-detail">{item.detail}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="metrics-grid">
        {heroStats.map((item) => (
          <MetricCard detail={item.detail} key={item.label} label={item.label} value={item.value} />
        ))}
      </section>

      <section className="content-grid">
        <Panel glow>
          <Pill tone="soft">Ready for services</Pill>
          <div className="clean-list">
            <article className="clean-item">
              <div>
                <strong>Sign in API</strong>
                <p className="panel-copy">`/api/auth/signin` can proxy to any identity service via `MAZE_AUTH_SERVICE_URL`.</p>
              </div>
              <span className="inline-note">Auth</span>
            </article>
            <article className="clean-item">
              <div>
                <strong>API key management</strong>
                <p className="panel-copy">`/api/workspace/api-keys` supports listing and generating backend ingestion keys.</p>
              </div>
              <span className="inline-note">Keys</span>
            </article>
            <article className="clean-item">
              <div>
                <strong>Workspace settings</strong>
                <p className="panel-copy">`/api/workspace/settings` is ready to sync environment, masking, and ingestion config.</p>
              </div>
              <span className="inline-note">Config</span>
            </article>
          </div>
          <div className="button-row">
            <Link className="button ghost" href="/docs">
              Review API docs
            </Link>
          </div>
        </Panel>

        <Panel>
          <Pill tone="light">What changed</Pill>
          <div className="clean-list">
            <article className="clean-item">
              <div>
                <strong>Less visual noise</strong>
                <p className="panel-copy">The landing page now focuses on value, proof, and product readiness instead of decorative blocks.</p>
              </div>
            </article>
            <article className="clean-item">
              <div>
                <strong>Sharper MVP story</strong>
                <p className="panel-copy">Every major page now points back to working flows: auth, analytics, settings, keys, and docs.</p>
              </div>
            </article>
          </div>
          <div className="button-row">
            <Link className="button primary" href="/dashboard">
              Explore analytics
            </Link>
          </div>
        </Panel>
      </section>
    </SiteShell>
  );
}
