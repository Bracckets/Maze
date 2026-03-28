import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui";
import { pricingPlans } from "@/lib/site-data";

const faqs = [
  {
    q: "Can I start without a credit card?",
    a: "Yes. The Starter plan is free forever. No card required until you upgrade.",
  },
  {
    q: "What counts as a session?",
    a: "One session = one user opening your app. We don't double-count background refreshes or crashes.",
  },
  {
    q: "Can I change plans later?",
    a: "Anytime. Upgrade instantly. Downgrade at the end of your billing cycle.",
  },
  {
    q: "Do you support custom data retention?",
    a: "Scale plan customers can choose from 30-day, 90-day, or 1-year retention windows by region.",
  },
];

export default function PricingPage() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="marketing-hero" style={{ paddingBottom: 36 }}>
        <p className="eyebrow">Simple pricing</p>
        <h1 className="display" style={{ marginBottom: 16 }}>
          Start free.
          <br />
          <span className="gradient-text">Scale when you're ready.</span>
        </h1>
        <p className="subtext" style={{ fontSize: "1rem", maxWidth: 480 }}>
          Every plan includes session capture, funnel analysis, and friction
          detection. Upgrade for higher volume and team features.
        </p>
      </section>

      {/* Plans */}
      <div className="pricing-grid" style={{ marginBottom: 40 }}>
        {pricingPlans.map((plan) => (
          <div
            className={`pricing-card ${plan.featured ? "featured" : ""}`}
            key={plan.name}
          >
            <div>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: plan.featured ? "var(--accent)" : "var(--text-3)",
                  marginBottom: 14,
                }}
              >
                {plan.name}
              </div>
              <div className="pricing-price">{plan.price}</div>
              {plan.cadence && (
                <div className="pricing-cadence">{plan.cadence}</div>
              )}
            </div>

            <p className="subtext" style={{ fontSize: "0.88rem" }}>
              {plan.description}
            </p>

            <ul className="pricing-features">
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>

            <Link
              className={`btn ${plan.featured ? "btn-primary" : "btn-ghost"}`}
              href="/signin"
              style={{ width: "100%", justifyContent: "center" }}
            >
              {plan.price === "Custom" ? "Talk to us" : "Get started free"}
            </Link>
          </div>
        ))}
      </div>

      {/* Included in all plans callout */}
      <Card>
        <p className="eyebrow" style={{ marginBottom: 18 }}>
          Included in every plan
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 20,
          }}
        >
          {[
            {
              icon: "◎",
              label: "Session capture",
              body: "iOS and Android SDKs with batching and retry.",
            },
            {
              icon: "⚡",
              label: "Friction detection",
              body: "Rage taps, dead taps, slow loads, form loops.",
            },
            {
              icon: "▦",
              label: "Funnel analytics",
              body: "Step-by-step drop-off visualization.",
            },
            {
              icon: "✦",
              label: "AI insights",
              body: "Plain-English explanations of what's broken.",
            },
          ].map((item) => (
            <div key={item.label}>
              <div
                style={{
                  fontSize: "1.2rem",
                  color: "var(--accent)",
                  marginBottom: 8,
                }}
              >
                {item.icon}
              </div>
              <div
                className="heading"
                style={{ fontSize: "0.9rem", marginBottom: 4 }}
              >
                {item.label}
              </div>
              <p className="subtext" style={{ fontSize: "0.83rem" }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* FAQ */}
      <div style={{ marginTop: 40, marginBottom: 40 }}>
        <p className="eyebrow" style={{ marginBottom: 20 }}>
          Common questions
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--gap)",
          }}
        >
          {faqs.map((faq) => (
            <Card key={faq.q}>
              <div
                className="heading"
                style={{ fontSize: "0.92rem", marginBottom: 8 }}
              >
                {faq.q}
              </div>
              <p className="subtext" style={{ fontSize: "0.86rem" }}>
                {faq.a}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Card accent>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div style={{ marginTop: 20 }}>
            <div className="display-sm" style={{ marginBottom: 6 }}>
              Questions about the right plan?
            </div>
            <p className="subtext" style={{ fontSize: "0.9rem" }}>
              We're happy to walk you through it. No sales pressure.
            </p>
          </div>
          <Link className="btn btn-primary btn-lg" href="/signin">
            Talk to the team
          </Link>
        </div>
      </Card>
    </SiteShell>
  );
}
