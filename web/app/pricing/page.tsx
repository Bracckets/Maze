import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/service-gateway";
import { pricingPlans } from "@/lib/site-data";

const faqs = [
  { q: "Can I start without a credit card?", a: "Yes. The Starter plan is free forever. No card required until you upgrade." },
  { q: "What counts as a session?", a: "One session = one user opening your app. We don't double-count background refreshes or crashes." },
  { q: "Can I change plans later?", a: "Anytime. Upgrade instantly. Downgrade at the end of your billing cycle." },
  { q: "Do you support custom data retention?", a: "Scale plan customers can choose from 30-day, 90-day, or 1-year retention windows by region." },
];

const included = [
  { icon: "◎", label: "Session capture", body: "iOS and Android SDKs with batching and retry." },
  { icon: "⚡", label: "Friction detection", body: "Rage taps, dead taps, slow loads, form loops." },
  { icon: "▦", label: "Funnel analytics", body: "Step-by-step drop-off visualization." },
  { icon: "✦", label: "AI insights", body: "Plain-English explanations of what's broken." },
];

export default async function PricingPage() {
  const currentUser = await getCurrentUser();
  const user = "user" in currentUser.data ? currentUser.data.user : null;
  const primaryHref = user ? "/dashboard" : "/signup";
  const currentPlanId = user?.plan_id ?? null;

  return (
    <SiteShell>
      <section className="marketing-hero" style={{ paddingBottom: 40 }}>
        <p className="eyebrow">Simple pricing</p>
        <h1 className="display" style={{ marginBottom: 16 }}>
          Start free.<br />
          <span className="gradient-text">Scale when you're ready.</span>
        </h1>
        <p className="subtext" style={{ fontSize: "1rem", maxWidth: 480 }}>
          Every plan includes session capture, funnel analysis, and friction detection.
          Upgrade for higher volume and team features.
        </p>
      </section>

      <div className="pricing-grid" style={{ marginBottom: 40 }}>
        {pricingPlans.map((plan) => (
          <div className={`pricing-card ${plan.featured ? "featured" : ""}`} key={plan.name}>
            <div>
              <div style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: plan.featured ? "var(--accent-2)" : "var(--text-3)",
                marginBottom: 14,
              }}>
                {plan.name}
                {plan.featured && (
                  <span style={{
                    marginLeft: 8,
                    background: "var(--accent-dim)",
                    color: "var(--accent-2)",
                    border: "1px solid rgba(123,111,255,0.2)",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: "0.7rem",
                  }}>Popular</span>
                )}
              </div>
              {currentPlanId === "free" && plan.name === "Starter" ? (
                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--green)", marginBottom: 10 }}>
                  ✓ Current plan
                </div>
              ) : null}
              <div className="pricing-price">{plan.price}</div>
              {plan.cadence && <div className="pricing-cadence">{plan.cadence}</div>}
            </div>
            <p className="subtext" style={{ fontSize: "0.87rem" }}>{plan.description}</p>
            <ul className="pricing-features">
              {plan.features.map((f) => (<li key={f}>{f}</li>))}
            </ul>
            <Link
              className={`btn ${plan.featured ? "btn-primary" : "btn-ghost"}`}
              href={primaryHref}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {plan.price === "Custom"
                ? (user ? "Open dashboard" : "Talk to us")
                : currentPlanId === "free" && plan.name === "Starter"
                  ? "Current plan"
                  : "Get started"}
            </Link>
          </div>
        ))}
      </div>

      <Card style={{ marginBottom: 40, padding: "36px 32px" }}>
        <p className="eyebrow" style={{ marginBottom: 20 }}>Included in every plan</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {included.map((item) => (
            <div key={item.label}>
              <div style={{ fontSize: "1.3rem", color: "var(--accent)", marginBottom: 10 }}>{item.icon}</div>
              <div className="heading" style={{ fontSize: "0.9rem", marginBottom: 5 }}>{item.label}</div>
              <p className="subtext" style={{ fontSize: "0.83rem" }}>{item.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ marginBottom: 40 }}>
        <p className="eyebrow" style={{ marginBottom: 20 }}>Common questions</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>
          {faqs.map((faq) => (
            <Card key={faq.q}>
              <div className="heading" style={{ fontSize: "0.92rem", marginBottom: 8 }}>{faq.q}</div>
              <p className="subtext" style={{ fontSize: "0.86rem" }}>{faq.a}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card accent style={{ padding: "40px 36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow">Questions about the right plan?</p>
            <div className="display-sm" style={{ marginBottom: 8 }}>We're happy to walk you through it.</div>
            <p className="subtext" style={{ fontSize: "0.9rem" }}>No sales pressure. Honest advice.</p>
          </div>
          <Link className="btn btn-primary btn-lg" href={user ? "/dashboard" : "/signin"}>
            {user ? "Open dashboard" : "Talk to the team"}
          </Link>
        </div>
      </Card>
    </SiteShell>
  );
}
