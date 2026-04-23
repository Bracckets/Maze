import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui";
import { getRequestLocale } from "@/lib/i18n-server";
import { getCurrentUser } from "@/lib/service-gateway";
import { pricingPlans } from "@/lib/site-data";

const faqs = [
  {
    q: "Can I start without a credit card?",
    a: "Yes. The Starter plan is free forever. No card is required until you upgrade.",
  },
  {
    q: "What counts as a session?",
    a: "One session is one user opening your app. We do not double-count background refreshes or crashes.",
  },
  {
    q: "Can I change plans later?",
    a: "Anytime. Upgrade instantly. Downgrade at the end of your billing cycle.",
  },
  {
    q: "Do you support custom data retention?",
    a: "Scale plan customers can choose from 30-day, 90-day, or 1-year retention windows by region.",
  },
] as const;

const included = [
  {
    label: "Session capture",
    body: "iOS and Android SDKs with batching and retry.",
  },
  {
    label: "Friction detection",
    body: "Rage taps, dead taps, slow loads, and form loops.",
  },
  { label: "Funnel analytics", body: "Step-by-step drop-off visualization." },
  {
    label: "AI insights",
    body: "Plain-language summaries of what needs attention.",
  },
] as const;

export default async function PricingPage() {
  const locale = await getRequestLocale();
  const currentUser = await getCurrentUser();
  const user = "user" in currentUser.data ? currentUser.data.user : null;
  const primaryHref = user ? "/dashboard" : "/signup";
  const currentPlanId = user?.plan_id ?? null;

  return (
    <SiteShell>
      <div className="pollex-page-stack">
        <section className="marketing-hero pollex-page-hero">
          <p className="eyebrow">
            {locale === "ar" ? "طھط³ط¹ظٹط±" : "Pricing"}
          </p>
          <h1 className="display">
            {locale === "ar"
              ? "إبدأ مجانًا"
              : "Start free. No Catch, it's Free."}
          </h1>
          <p className="subtext">
            {locale === "ar"
              ? "ظƒظ„ ط¨ط§ظ‚ط© طھط´ظ…ظ„ ط§ظ„طھظ‚ط§ط· ط§ظ„ط¬ظ„ط³ط§طھ ظˆطھط­ظ„ظٹظ„ ط§ظ„ظ…ط³ط§ط± ظˆط§ظƒطھط´ط§ظپ ط§ظ„ط§ط­طھظƒط§ظƒ. طھط±ظ‚ظ‘ ط¹ظ†ط¯ظ…ط§ طھط­طھط§ط¬ ط­ط¬ظ…ظ‹ط§ ط£ظƒط¨ط±."
              : "Every plan includes session capture, funnel analysis, and friction detection. Upgrade when you need more volume, more teammates, or deeper workflow control."}
          </p>
          <div className="pollex-page-actions">
            <Link className="btn btn-primary btn-lg" href={primaryHref}>
              {user ? "Open dashboard" : "Create workspace"}
            </Link>
            <Link className="btn btn-ghost btn-lg" href="/docs">
              Read docs
            </Link>
          </div>
        </section>

        <div className="pricing-grid">
          {pricingPlans.map((plan) => (
            <article
              className={`pricing-card ${plan.featured ? "featured" : ""}`.trim()}
              key={plan.name}
            >
              <div className="pollex-card-stack">
                <div>
                  <p className="eyebrow" style={{ marginBottom: 12 }}>
                    {plan.name}
                    {plan.featured ? " / Popular" : ""}
                  </p>
                  {currentPlanId === "free" && plan.name === "Starter" ? (
                    <p
                      style={{
                        margin: "0 0 10px",
                        color: "var(--text-2)",
                        fontSize: "0.82rem",
                      }}
                    >
                      Current plan
                    </p>
                  ) : null}
                  <div className="pricing-price">{plan.price}</div>
                  {plan.cadence ? (
                    <div className="pricing-cadence">{plan.cadence}</div>
                  ) : null}
                </div>

                <p className="subtext" style={{ fontSize: "0.9rem" }}>
                  {plan.description}
                </p>

                <ul className="pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>

              <Link
                className={`btn ${plan.featured ? "btn-primary" : "btn-ghost"}`}
                href={primaryHref}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {plan.price === "Custom"
                  ? user
                    ? "Open dashboard"
                    : "Talk to us"
                  : currentPlanId === "free" && plan.name === "Starter"
                    ? "Current plan"
                    : "Get started"}
              </Link>
            </article>
          ))}
        </div>

        <Card>
          <p className="eyebrow" style={{ marginBottom: 18 }}>
            Included in every plan
          </p>
          <div className="pollex-inline-grid-2">
            {included.map((item) => (
              <div className="pollex-page-note" key={item.label}>
                <strong>{item.label}</strong>
                <p className="subtext" style={{ marginTop: 8 }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <div className="pollex-inline-grid-2">
          {faqs.map((faq) => (
            <Card key={faq.q}>
              <div
                className="heading"
                style={{ fontSize: "1rem", marginBottom: 8 }}
              >
                {faq.q}
              </div>
              <p className="subtext">{faq.a}</p>
            </Card>
          ))}
        </div>

        <Card accent>
          <div
            className="pollex-page-actions"
            style={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <div className="pollex-card-stack" style={{ gap: 8 }}>
              <p className="eyebrow">Questions about the right plan?</p>
              <div className="display-sm">
                Choose the quietest plan that fits your current scale.
              </div>
              <p className="subtext">
                No pressure. Just the next sensible step for your workspace.
              </p>
            </div>
            <Link
              className="btn btn-primary btn-lg"
              href={user ? "/dashboard" : "/signin"}
            >
              {user ? "Open dashboard" : "Talk to the team"}
            </Link>
          </div>
        </Card>
      </div>
    </SiteShell>
  );
}
