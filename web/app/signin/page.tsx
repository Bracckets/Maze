import Link from "next/link";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignInForm } from "@/components/signin-form";
import { getRequestLocale } from "@/lib/i18n-server";

const defaultStats = [
  { label: "Sessions analyzed", value: "4.2M" },
  { label: "Time to insight", value: "6 min" },
  { label: "Recovered drop-offs", value: "31%" },
];

export default async function SignInPage() {
  const locale = await getRequestLocale();
  const isArabic = locale === "ar";

  return (
    <main className="pollex-auth-shell">
      <div className="auth-locale-bar">
        <LocaleSwitcher />
      </div>
      <div className="apple-auth-card">
        <aside className="apple-auth-aside">
          <Brand />
          <div className="space-y-4">
            <p className="eyebrow">{isArabic ? "العودة إلى مساحة العمل" : "Return to the workspace"}</p>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-foreground md:text-5xl">
              {isArabic ? "سجّل الدخول إلى واجهة Pollex." : "Sign back into the Pollex workspace."}
            </h1>
            <p className="subtext text-base leading-8">
              {isArabic
                ? "الخرائط الحرارية، الجلسات، وحالة التكامل جاهزة عند الدخول. الواجهة الجديدة تحافظ على الهدوء وتبرز ما يحتاج قرارًا."
                : "Heatmaps, session streams, and integration health are ready when you return. The new surface stays quiet and keeps the important decisions obvious."}
            </p>
          </div>

          <div className="apple-auth-stats">
            {defaultStats.map((item) => (
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
              {isArabic ? "ادخل إلى مساحة Pollex" : "Enter your Pollex workspace"}
            </h2>
            <p className="subtext max-w-md">
              {isArabic ? "استخدم بيانات الاعتماد للعودة مباشرة إلى لوحة الإشارة." : "Use your workspace credentials to return directly to the signal surface."}
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
