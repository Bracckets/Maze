import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { Panel, Pill } from "@/components/ui";
import { pricingPlans } from "@/lib/site-data";

export default function PricingPage() {
  return (
    <SiteShell eyebrow="Try free for limited time">
      <section className="hero-grid">
        <div className="hero-copy">
          <h1 className="page-title">
            Pricing for teams who
            <br />
            <span className="gradient-text">ship before churn wins.</span>
          </h1>
          <p className="page-copy">
            Choose a plan that fits your session volume, experiment pace, and the number of squads turning behavioral signals into
            product decisions.
          </p>
        </div>
        <Panel glow>
          <Pill tone="light">Included in every plan</Pill>
          <div className="issue-list">
            <article className="issue-item">
              <strong>Session reconstruction</strong>
              <p className="panel-copy">Rebuild user journeys and isolate exit points across onboarding steps.</p>
            </article>
            <article className="issue-item">
              <strong>Rule-based friction detection</strong>
              <p className="panel-copy">Rage taps, dead taps, slow responses, form loops, and drop-offs.</p>
            </article>
          </div>
        </Panel>
      </section>

      <section className="pricing-grid">
        {pricingPlans.map((plan) => (
          <Panel className={plan.featured ? "panel-glow" : ""} key={plan.name}>
            {plan.featured ? <Pill tone="light">Most popular</Pill> : <Pill>{plan.name}</Pill>}
            <div>
              <strong className="metric-value">{plan.price}</strong>
              <span className="panel-copy"> {plan.cadence}</span>
            </div>
            <p className="panel-copy">{plan.description}</p>
            <ul className="plan-features">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <Link className={`button ${plan.featured ? "primary" : "ghost"}`} href="/signin">
              {plan.price === "Custom" ? "Talk to sales" : "Start free"}
            </Link>
          </Panel>
        ))}
      </section>
    </SiteShell>
  );
}
