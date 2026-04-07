import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { Tag } from "@/components/ui";
import { getRequestLocale } from "@/lib/i18n-server";
import { getCurrentUser } from "@/lib/service-gateway";

const featureCards = [
  {
    title: "Clarity over dashboard theater",
    body: "The product surface leads with the next useful decision, not with decoration or metrics that compete for attention.",
  },
  {
    title: "One visual rhythm across flows",
    body: "Public pages, auth, dashboard, and heatmap all share the same calmer spacing and material language.",
  },
  {
    title: "Touch-safe and glanceable",
    body: "Controls stay generous, contrast stays readable, and information remains easy to parse on phone and desktop.",
  },
];

export default async function HomePage() {
  const locale = await getRequestLocale();
  const currentUser = await getCurrentUser();
  const user = "user" in currentUser.data ? currentUser.data.user : null;
  const isArabic = locale === "ar";

  return (
    <SiteShell>
      <section className="apple-hero">
        <div className="apple-hero-grid">
          <div className="apple-kicker">
            <span className="apple-kicker-dot" />
            {isArabic ? "تجربة أوضح للمنتج" : "A clearer product intelligence surface"}
          </div>
          <h1 className="apple-display">
            {isArabic
              ? "راقب الاحتكاك قبل أن يفقد المستخدم ثقته."
              : "Track friction before the customer loses confidence."}
          </h1>
          <p className="apple-subcopy">
            {isArabic
              ? "يعيد هذا الاتجاه تصميم Maze حول الوضوح، الهدوء، والهرمية. الشاشة الأولى تشرح القيمة بسرعة، وسطح العمل يبقي الإشارة قريبة من الإجراء."
              : "This direction treats Maze less like a dashboard theme and more like a coherent product surface. The first screen explains value instantly, and the working views stay calm enough to trust under pressure."}
          </p>
          <div className="maze-cta-row">
            <Link className="btn btn-primary btn-lg" href={user ? "/dashboard" : "/signup"}>
              {user
                ? isArabic
                  ? "افتح مساحة العمل"
                  : "Open workspace"
                : isArabic
                  ? "ابدأ مع Maze"
                  : "Start with Maze"}
            </Link>
            <Link className="btn btn-ghost btn-lg" href={user ? "/heatmap" : "/docs"}>
              {user
                ? isArabic
                  ? "افحص الخريطة الحرارية"
                  : "Inspect heatmaps"
                : isArabic
                  ? "اقرأ دليل الدمج"
                  : "Read the integration guide"}
            </Link>
          </div>
        </div>

        <div className="apple-showcase">
          <div className="apple-showcase-panel">
            <p className="metric-label">{isArabic ? "لوحة الإشارة" : "Signal overview"}</p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div>
                <p className="heading">{isArabic ? "معدل الإكمال" : "Completion rate"}</p>
                <strong className="metric-num">69%</strong>
              </div>
              <Tag tone="green">{isArabic ? "مباشر" : "Live"}</Tag>
            </div>
          </div>

          <div className="apple-showcase-phone">
            <div className="apple-showcase-screen">
              <div className="apple-showcase-notch" />
              <div className="apple-surface-line apple-surface-line-a" />
              <div className="apple-surface-line apple-surface-line-b" />
              <div className="apple-surface-line apple-surface-line-c" />
              <div className="apple-surface-line apple-surface-line-d" />
              <div className="apple-surface-line apple-surface-line-e" />
              <div className="apple-surface-line apple-surface-line-f" />
              <div className="apple-surface-line apple-surface-line-g" />
            </div>
          </div>

          <div className="apple-floating-card apple-floating-a">
            <p className="metric-label">{isArabic ? "المشكلة الأولى" : "Top issue"}</p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">KYC form</h3>
            <p className="subtext mt-2">Rage taps cluster around the identity capture CTA.</p>
          </div>

          <div className="apple-floating-card apple-floating-b">
            <p className="metric-label">{isArabic ? "الخطوة التالية" : "Next action"}</p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">Export hotspot rows</h3>
            <p className="subtext mt-2">Share evidence with engineering without leaving the product surface.</p>
          </div>

          <div className="apple-signal-pill">
            <span className="dot dot-green" />
            <div>
              <strong className="heading">{isArabic ? "وقت الرؤية" : "Time to insight"}</strong>
              <p className="subtext text-sm">6 min average this week</p>
            </div>
          </div>
        </div>
      </section>

      <section className="apple-feature-grid">
        {featureCards.map((item) => (
          <article className="apple-feature-card" key={item.title}>
            <p className="eyebrow">Design principle</p>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <section className="story-board mt-6">
        <div className="apple-stage-card">
          <p className="eyebrow">{isArabic ? "للعمليات اليومية" : "For daily operation"}</p>
          <h3>{isArabic ? "سطح العمل يصبح أكثر هدوءًا، لا أقل فائدة." : "The product surface gets quieter, not weaker."}</h3>
          <p>
            {isArabic
              ? "تبقى الجداول، الخرائط الحرارية، والتكاملات في أماكنها، لكن الواجهة تقلل الاحتكاك البصري وتقرّب الأدوات من المحتوى الذي تغيّره."
              : "Tables, heatmaps, settings, and integrations stay intact, but the chrome recedes so the content does the talking."}
          </p>
        </div>
        <div className="apple-stage-card">
          <p className="eyebrow">{isArabic ? "للصفحة الأولى" : "For first impression"}</p>
          <h3>{isArabic ? "هوية أهدأ، وشرح أسرع." : "A softer identity with a faster explanation."}</h3>
          <p>
            {isArabic
              ? "تقل كمية النص، تتسع المساحات البيضاء، ويصبح الهرم البصري أوضح من أول تمرير."
              : "The first screen becomes more cinematic and less crowded, with tighter copy and a clearer action hierarchy."}
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
