import Link from "next/link";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignUpForm } from "@/components/signup-form";
import { getRequestLocale } from "@/lib/i18n-server";

const defaultHighlights = [
  { label: "Setup time", value: "10 min" },
  { label: "SDKs included", value: "iOS + Android" },
  { label: "Billing model", value: "Workspace" },
];

export default async function SignUpPage() {
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
            <p className="eyebrow">{isArabic ? "إطلاق سريع" : "Fast launch"}</p>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-foreground md:text-5xl">
              {isArabic ? "أنشئ مساحة Pollex وابدأ جمع الإشارة." : "Create a Pollex workspace and start collecting signal."}
            </h1>
            <p className="subtext text-base leading-8">
              {isArabic
                ? "المسار الجديد يختصر التهيئة ويجعل الخطوة الأولى أوضح. أقل ضجيج بصري، أكثر تركيزًا على الوصول الفعلي إلى البيانات."
                : "The redesigned flow trims setup noise and makes the first step clearer. Less visual clutter, more focus on getting real signal live."}
            </p>
          </div>

          <div className="apple-auth-stats">
            {defaultHighlights.map((item) => (
              <div className="apple-auth-stat" key={item.label}>
                <p className="metric-label">{item.label}</p>
                <p className="metric-num mt-3">{item.value}</p>
              </div>
            ))}
          </div>
        </aside>

        <section className="apple-auth-main">
          <div className="space-y-3">
            <p className="eyebrow">{isArabic ? "إنشاء مساحة عمل" : "Create workspace"}</p>
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground">
              {isArabic ? "ابدأ مساحة Pollex الجديدة" : "Start your Pollex workspace"}
            </h2>
            <p className="subtext max-w-md">
              {isArabic ? "ننشىء الحساب ونأخذك مباشرة إلى السطح التشغيلي الجديد." : "We create the account, provision the workspace, and route you straight into the new operating surface."}
            </p>
          </div>

          <div className="mt-8">
            <SignUpForm />
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {isArabic ? "بإنشاء الحساب فإنك توافق على " : "By creating an account you agree to our "}
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
