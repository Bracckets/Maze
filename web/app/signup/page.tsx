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
  const highlights = isArabic
    ? [
        { label: "زمن الإعداد", value: "10 دقائق" },
        { label: "الحزم المتاحة", value: "iOS + Android" },
        { label: "نموذج الفوترة", value: "لكل مساحة" },
      ]
    : defaultHighlights;

  return (
    <main className="apple-auth-shell">
      <div className="auth-locale-bar">
        <LocaleSwitcher />
      </div>
      <div className="apple-auth-card">
        <aside className="apple-auth-aside">
          <Brand />
          <div className="mt-10 max-w-xl space-y-4">
            <p className="eyebrow">{isArabic ? "إطلاق سريع" : "Fast launch"}</p>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-foreground md:text-5xl">
              {isArabic
                ? "أنشئ مساحة العمل وابدأ جمع الإشارة."
                : "Create the workspace and start collecting signal."}
            </h1>
            <p className="subtext text-base leading-8">
              {isArabic
                ? "الهدف هنا أن تبدأ بسرعة، من دون فوضى بصرية أو خطوات متزاحمة."
                : "The goal in this branch is focus: fewer visual obstacles, gentler hierarchy, and a clearer setup path."}
            </p>
          </div>

          <div className="apple-auth-stats">
            {highlights.map((item) => (
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
              {isArabic ? "ابدأ مساحة Maze الجديدة" : "Start your Maze workspace"}
            </h2>
            <p className="subtext max-w-md">
              {isArabic
                ? "سننشئ الحساب وننقلك مباشرة إلى مركز التحكم."
                : "We create the account, provision the workspace, and route you straight into the command center."}
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
