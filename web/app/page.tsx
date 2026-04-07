import Link from "next/link";

import { LandingHeroVisual } from "@/components/landing-hero-visual";
import { SiteShell } from "@/components/site-shell";
import { Card, Tag } from "@/components/ui";
import { getRequestLocale } from "@/lib/i18n-server";
import { getCurrentUser } from "@/lib/service-gateway";

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
  const locale = await getRequestLocale();
  const currentUser = await getCurrentUser();
  const user = "user" in currentUser.data ? currentUser.data.user : null;
  const storyPillars = locale === "ar"
    ? [
        {
          title: "التقط المسار الحقيقي",
          body: "يسجل Maze النقرات والتوقفات وأنماط الانسحاب عبر تطبيقات الجوال والويب من دون إعادة بناء منتجك.",
        },
        {
          title: "شاهد الاحتكاك بصرياً",
          body: "تعرض الخرائط الحرارية والملخصات المرتبطة بإعادة التشغيل أماكن الضغط والانتظار وفقدان الثقة على الشاشة نفسها.",
        },
        {
          title: "حوّل الإشارة إلى إصلاح",
          body: "ترتّب اللوحة ما يستحق الأولوية الآن حتى يتمكن فريق المنتج والهندسة من التحقق والتصدير والتنفيذ بسرعة.",
        },
      ]
    : [
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
  const proofNotes = locale === "ar"
    ? [
        "حزم iOS وAndroid موجودة داخل المستودع",
        "لوحة ويب وخريطة حرارية جاهزتان",
        "لا حاجة لتغييرات خلفية كبيرة لبدء التجربة",
      ]
    : [
        "iOS and Android SDKs already in the repo",
        "Web dashboard and heatmap included",
        "Minimal backend changes needed for the redesign",
      ];

  return (
    <SiteShell>
      <section className="maze-hero">
        <div className="maze-hero-copy">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            {locale === "ar" ? "ذكاء المنتج لرحلات التهيئة والتفعيل" : "Product intelligence for onboarding and activation"}
          </div>
          <h1 className="maze-display">
            {locale === "ar" ? (
              <>
                شاهد الاحتكاك يظهر
                <br />
                قبل أن يختفي المستخدمون.
              </>
            ) : (
              <>
                Watch friction appear
                <br />
                before your users disappear.
              </>
            )}
          </h1>
          <p className="maze-subcopy">
            {locale === "ar"
              ? "يحوّل Maze بيانات التفاعل الخام إلى سطح منتج حي: أين ينقر الناس، وأين يترددون، وما الذي يجب على فريقك فحصه بعد ذلك عبر الجوال والويب."
              : "Maze turns raw interaction data into a living product surface: where people tap, where they hesitate, and what your team should inspect next across mobile and web."}
          </p>
          <div className="maze-cta-row">
            <Link className="btn btn-primary btn-lg" href={user ? "/dashboard" : "/signup"}>
              {user ? (locale === "ar" ? "افتح مركز التحكم" : "Open command center") : (locale === "ar" ? "ابدأ مع Maze" : "Start with Maze")}
            </Link>
            <Link className="btn btn-ghost btn-lg" href={user ? "/heatmap" : "/docs"}>
              {user ? (locale === "ar" ? "افحص الخرائط الحرارية" : "Inspect heatmaps") : (locale === "ar" ? "اقرأ دليل الدمج" : "Read the integration guide")}
            </Link>
          </div>
          <div className="maze-proof-row">
            {proofNotes.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <LandingHeroVisual />
      </section>

      <section className="poster-section">
        <div className="poster-intro">
          <p className="eyebrow">{locale === "ar" ? "ما الذي يتغير مع Maze" : "What changes with Maze"}</p>
          <h2 className="display-sm">
            {locale === "ar"
              ? "يمكن لشاشة واحدة الآن أن تروي القصة كاملة: النية والاحتكاك والخطوة التالية."
              : "One screen can finally tell the whole story: intent, friction, and next action."}
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
          <p className="eyebrow">{locale === "ar" ? "مصمم لفرق التشغيل" : "Built for operators"}</p>
          <h2 className="display-sm">{locale === "ar" ? "لوحة تساعد الفرق على اتخاذ القرار لا مجرد مشاهدة الرسوم." : "A dashboard that helps teams decide, not just admire charts."}</h2>
          <p className="subtext">
            {locale === "ar"
              ? "افحص الصفوف، وسّع الخريطة الحرارية، صدّر الأدلة، وانتقل من النمط إلى مهمة في قائمة العمل من دون انتظار تطوير خلفي مخصص."
              : "Inspect rows, expand the heatmap, export evidence, and move from a pattern to a backlog item without waiting on custom backend work."}
          </p>
        </div>
        <div className="story-board-panels">
          <Card className="story-preview">
            <div className="story-preview-header">
              <div>
                <div className="heading">{locale === "ar" ? "مركز التحكم" : "Command center"}</div>
                <p className="subtext">{locale === "ar" ? "مكثف، سريع الاستجابة، ومبني حول التنفيذ." : "Dense, responsive, and built around action."}</p>
              </div>
              <Tag tone="accent">{locale === "ar" ? "مباشر" : "Live"}</Tag>
            </div>
            <div className="story-metrics">
              <div>
                <span>{locale === "ar" ? "الإكمال" : "Completion"}</span>
                <strong>69%</strong>
              </div>
              <div>
                <span>{locale === "ar" ? "الشاشات الساخنة" : "Hot screens"}</span>
                <strong>8</strong>
              </div>
              <div>
                <span>{locale === "ar" ? "المشكلات ذات الأولوية" : "Priority issues"}</span>
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
                <div className="heading">{locale === "ar" ? "مستكشف الخريطة الحرارية" : "Heatmap explorer"}</div>
                <p className="subtext">{locale === "ar" ? "قرّب، وافحص المناطق الساخنة، وصدّر الصفوف." : "Zoom in, inspect hotspots, export rows."}</p>
              </div>
              <Tag tone="red">{locale === "ar" ? "تركيز" : "Focus"}</Tag>
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
          <p className="eyebrow">{locale === "ar" ? "جاهز لإطلاق التجربة الجديدة" : "Ready to ship the redesign"}</p>
          <h2 className="display-sm">{locale === "ar" ? "أصبح لـ Maze الآن انطباع أول أقوى وسطح عمل أكثر فائدة." : "Maze now has a louder first impression and a more useful working surface."}</h2>
        </div>
        <div className="maze-cta-row">
          <Link className="btn btn-primary btn-lg" href={user ? "/dashboard" : "/signup"}>
            {user ? (locale === "ar" ? "افتح اللوحة الجديدة" : "Open the new dashboard") : (locale === "ar" ? "أنشئ مساحة عملك" : "Create your workspace")}
          </Link>
          <Link className="btn btn-ghost btn-lg" href="/pricing">
            {locale === "ar" ? "شاهد الباقات" : "See plans"}
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
