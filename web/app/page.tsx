import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { Tag } from "@/components/ui";
import { getRequestLocale } from "@/lib/i18n-server";
import { getCurrentUser } from "@/lib/service-gateway";

const featureCards = [
  {
    title: "Signal first",
    body: "The workspace leads with action, not dashboard clutter. Operators land on what changed and what to inspect next.",
  },
  {
    title: "Quiet liquid surfaces",
    body: "Translucent panels keep hierarchy soft without slipping into novelty chrome or platform mimicry.",
  },
  {
    title: "One product rhythm",
    body: "Dashboard, usage, heatmap, auth, and docs now feel like one system instead of separate projects.",
  },
];

export default async function HomePage() {
  const locale = await getRequestLocale();
  const currentUser = await getCurrentUser();
  const user = "user" in currentUser.data ? currentUser.data.user : null;
  const isArabic = locale === "ar";

  return (
    <SiteShell>
      <section className="pollex-landing pollex-landing-hero">
        <div className="pollex-landing-grid">
          <div className="pollex-landing-copy">
            <div className="pollex-landing-kicker">
              <span />
              {isArabic ? "ذكاء الإشارة للمنتج" : "Product signal intelligence"}
            </div>
            <h1>{isArabic ? "Pollex يهدئ الواجهة ويقرب الإشارة." : "Pollex brings the signal closer and the noise down."}</h1>
            <p>
              {isArabic
                ? "سطح جديد لتحليل السلوك، الخرائط الحرارية، والاستخدام اليومي. أقل ازدحامًا، أكثر وضوحًا، ومصمم لقرارات سريعة."
                : "A redesigned product surface for behavior analysis, heatmaps, and usage tracking. More calm, more legible, and built for fast decisions."}
            </p>
            <div className="pollex-landing-actions">
              <Link className="btn btn-primary btn-lg" href={user ? "/dashboard" : "/signup"}>
                {user ? (isArabic ? "افتح لوحة العمل" : "Open dashboard") : isArabic ? "ابدأ مع Pollex" : "Start with Pollex"}
              </Link>
              <Link className="btn btn-ghost btn-lg" href={user ? "/heatmap" : "/docs"}>
                {user ? (isArabic ? "افحص الخريطة الحرارية" : "Inspect heatmap") : isArabic ? "اقرأ التوثيق" : "Read docs"}
              </Link>
            </div>
          </div>

          <div className="pollex-landing-stage">
            <div className="pollex-landing-mini-shell">
              <div className="pollex-landing-mini-sidebar">
                <Tag tone="accent">Pollex</Tag>
                <div className="pollex-landing-mini-panel" />
                <div className="pollex-landing-mini-panel" />
                <div className="pollex-landing-mini-panel" />
              </div>
              <div className="pollex-landing-mini-content">
                <div className="pollex-landing-mini-tabs">
                  <div className="pollex-landing-mini-panel" />
                  <div className="pollex-landing-mini-panel" />
                  <div className="pollex-landing-mini-panel" />
                  <div className="pollex-landing-mini-panel" />
                </div>
                <div className="pollex-landing-panels">
                  <div className="pollex-landing-mini-panel" />
                  <div className="pollex-landing-mini-panel" />
                </div>
                <div className="pollex-landing-panel-row">
                  <div className="pollex-landing-mini-panel" />
                  <div className="pollex-landing-mini-panel" />
                  <div className="pollex-landing-mini-panel" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pollex-feature-strip">
        {featureCards.map((item) => (
          <article className="pollex-feature" key={item.title}>
            <p className="eyebrow">Pollex principle</p>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </section>
    </SiteShell>
  );
}
