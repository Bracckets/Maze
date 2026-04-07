import Link from "next/link";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignInForm } from "@/components/signin-form";
import { getRequestLocale } from "@/lib/i18n-server";

const defaultStats = [
  { label: "Sessions analyzed", value: "4.2M" },
  { label: "Time to first insight", value: "6 min" },
  { label: "Recovered drop-offs", value: "31%" },
];

export default async function SignInPage() {
  const locale = await getRequestLocale();
  const isArabic = locale === "ar";
  const stats = isArabic
    ? [
        { label: "الجلسات المحللة", value: "4.2M" },
        { label: "الوصول لأول رؤية", value: "6 دقائق" },
        { label: "الانسحابات المستعادة", value: "31%" },
      ]
    : defaultStats;

  return (
    <main className="apple-auth-shell">
      <div className="auth-locale-bar">
        <LocaleSwitcher />
      </div>
      <div className="apple-auth-card">
        <aside className="apple-auth-aside">
          <Brand />
          <div className="mt-10 max-w-xl space-y-4">
            <p className="eyebrow">{isArabic ? "عودة إلى العمل" : "Back to the workspace"}</p>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-foreground md:text-5xl">
              {isArabic
                ? "سجّل الدخول إلى سطح قراءة السلوك."
                : "Sign back into the product behavior surface."}
            </h1>
            <p className="subtext text-base leading-8">
              {isArabic
                ? "الخرائط الحرارية، الجلسات، والتكاملات جاهزة. هذه النسخة تبقي الطريق إلى الإشارة أبسط وأهدأ."
                : "Heatmaps, session streams, and integration health are ready when you are. This branch keeps the path to signal lighter and easier to trust."}
            </p>
          </div>

          <div className="apple-auth-stats">
            {stats.map((item) => (
              <div className="apple-auth-stat" key={item.label}>
                <p className="metric-label">{item.label}</p>
                <p className="metric-num mt-3">{item.value}</p>
              </div>
            ))}
          </div>
        </aside>

        <section className="apple-auth-main">
          <div className="space-y-3">
            <p className="eyebrow">{isArabic ? "تسجيل الدخول" : "Sign in"}</p>
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground">
              {isArabic ? "ادخل إلى مساحة Maze" : "Enter your Maze workspace"}
            </h2>
            <p className="subtext max-w-md">
              {isArabic
                ? "استخدم بيانات مساحة العمل للعودة إلى مركز التحكم."
                : "Use your workspace credentials to return to the command center."}
            </p>
          </div>

          <div className="mt-8">
            <SignInForm />
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {isArabic ? "بتسجيل الدخول فإنك توافق على " : "By signing in you agree to our "}
            <Link href="/terms" style={{ color: "var(--text)" }}>
              {isArabic ? "الشروط" : "Terms"}
            </Link>{" "}
            {isArabic ? "و" : "and "}
            <Link href="/privacy" style={{ color: "var(--text)" }}>
              {isArabic ? "سياسة الخصوصية" : "Privacy Policy"}
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
