import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { Card, Tag } from "@/components/ui";
import { getCurrentUser } from "@/lib/service-gateway";

const signalRows = [
  { label: "Dead taps", value: "128", note: "clustered on KYC step 2" },
  { label: "Drop-offs", value: "31%", note: "highest after OTP request" },
  { label: "Latency hesitation", value: "1.8s", note: "before first success state" },
];

const storyPillars = [
  {
    title: "Capture the real path",
    body: "Maze records taps, pauses, and abandonment patterns across mobile and web flows without rewriting your product stack.",
  },
  {
    title: "See friction spatially",
    body: "Heatmaps and replay-aware summaries show where users push, wait, and lose trust on the screen itself.",
  },
  {
    title: "Move from signal to fix",
    body: "The dashboard ranks what matters now, so product and engineering can inspect rows, export evidence, and ship the next improvement fast.",
  },
];

const proofNotes = [
  "iOS and Android SDKs already in the repo",
  "Web dashboard and heatmap included",
  "Minimal backend changes needed for the redesign",
];

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const user = "user" in currentUser.data ? currentUser.data.user : null;

  return (
    <SiteShell>
      <section className="maze-hero">
        <div className="maze-hero-copy">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Product intelligence for onboarding and activation
          </div>
          <h1 className="maze-display">
            Watch friction appear
            <br />
            before your users disappear.
          </h1>
          <p className="maze-subcopy">
            Maze turns raw interaction data into a living product surface: where people
            tap, where they hesitate, and what your team should inspect next across mobile
            and web.
          </p>
          <div className="maze-cta-row">
            <Link className="btn btn-primary btn-lg" href={user ? "/dashboard" : "/signup"}>
              {user ? "Open command center" : "Start with Maze"}
            </Link>
            <Link className="btn btn-ghost btn-lg" href={user ? "/heatmap" : "/docs"}>
              {user ? "Inspect heatmaps" : "Read the integration guide"}
            </Link>
          </div>
          <div className="maze-proof-row">
            {proofNotes.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="signal-stage" aria-hidden="true">
          <div className="signal-backdrop" />
          <div className="signal-grid" />
          <div className="signal-orbit signal-orbit-a" />
          <div className="signal-orbit signal-orbit-b" />
          <div className="signal-phone">
            <div className="signal-phone-top" />
            <div className="signal-screen">
              <div className="signal-screen-glow" />
              <div className="signal-screen-noise" />
              <div className="signal-hotspot hotspot-a" />
              <div className="signal-hotspot hotspot-b" />
              <div className="signal-hotspot hotspot-c" />
              <div className="signal-flow flow-a" />
              <div className="signal-flow flow-b" />
              <div className="signal-flow flow-c" />
              <div className="signal-ui signal-ui-title" />
              <div className="signal-ui signal-ui-card" />
              <div className="signal-ui signal-ui-field signal-ui-field-a" />
              <div className="signal-ui signal-ui-field signal-ui-field-b" />
              <div className="signal-ui signal-ui-button" />
            </div>
          </div>
          <div className="signal-callout signal-callout-left">
            <span>rage tap cluster</span>
            <strong>identity form</strong>
          </div>
          <div className="signal-callout signal-callout-right">
            <span>drop-off spike</span>
            <strong>OTP handoff</strong>
          </div>
          <div className="signal-callout signal-callout-bottom">
            <span>hesitation gap</span>
            <strong>loading confirmation</strong>
          </div>
          <div className="signal-ticker">
            {signalRows.map((row) => (
              <div key={row.label} className="signal-ticker-row">
                <span>{row.label}</span>
                <strong>{row.value}</strong>
                <em>{row.note}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="poster-section">
        <div className="poster-intro">
          <p className="eyebrow">What changes with Maze</p>
          <h2 className="display-sm">
            One screen can finally tell the whole story: intent, friction, and next action.
          </h2>
        </div>
        <div className="poster-grid">
          {storyPillars.map((pillar, index) => (
            <div className="poster-column" key={pillar.title} style={{ animationDelay: `${index * 0.1}s` }}>
              <span className="poster-index">0{index + 1}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="story-board">
        <div className="story-board-copy">
          <p className="eyebrow">Built for operators</p>
          <h2 className="display-sm">A dashboard that helps teams decide, not just admire charts.</h2>
          <p className="subtext">
            Inspect rows, expand the heatmap, export evidence, and move from a pattern to a backlog item
            without waiting on custom backend work.
          </p>
        </div>
        <div className="story-board-panels">
          <Card className="story-preview">
            <div className="story-preview-header">
              <div>
                <div className="heading">Command center</div>
                <p className="subtext">Dense, responsive, and built around action.</p>
              </div>
              <Tag tone="accent">Live</Tag>
            </div>
            <div className="story-metrics">
              <div>
                <span>Completion</span>
                <strong>69%</strong>
              </div>
              <div>
                <span>Hot screens</span>
                <strong>8</strong>
              </div>
              <div>
                <span>Priority issues</span>
                <strong>14</strong>
              </div>
            </div>
            <div className="story-table">
              <div><span>kyc_form</span><strong>rage tap</strong></div>
              <div><span>otp_verify</span><strong>drop-off</strong></div>
              <div><span>welcome</span><strong>slow response</strong></div>
            </div>
          </Card>
          <Card className="story-preview story-preview-heatmap">
            <div className="story-preview-header">
              <div>
                <div className="heading">Heatmap explorer</div>
                <p className="subtext">Zoom in, inspect hotspots, export rows.</p>
              </div>
              <Tag tone="red">Focus</Tag>
            </div>
            <div className="heatmap-mini">
              <div className="heatmap-mini-hot heatmap-mini-hot-a" />
              <div className="heatmap-mini-hot heatmap-mini-hot-b" />
              <div className="heatmap-mini-hot heatmap-mini-hot-c" />
            </div>
          </Card>
        </div>
      </section>

      <section className="final-band">
        <div>
          <p className="eyebrow">Ready to ship the redesign</p>
          <h2 className="display-sm">Maze now has a louder first impression and a more useful working surface.</h2>
        </div>
        <div className="maze-cta-row">
          <Link className="btn btn-primary btn-lg" href={user ? "/dashboard" : "/signup"}>
            {user ? "Open the new dashboard" : "Create your workspace"}
          </Link>
          <Link className="btn btn-ghost btn-lg" href="/pricing">
            See plans
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
