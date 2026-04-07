import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignUpForm } from "@/components/signup-form";
import { getRequestLocale } from "@/lib/i18n-server";

const defaultHighlights = [
  { label: "Setup time", value: "10 min" },
  { label: "SDKs included", value: "iOS + Android" },
  { label: "Insights generated", value: "Live" },
  { label: "Billing model", value: "Workspace" },
];

export default async function SignUpPage() {
  const locale = await getRequestLocale();
  const highlights = locale === "ar"
    ? [
        { label: "وقت الإعداد", value: "10 دقائق" },
        { label: "الحزم المتاحة", value: "iOS + Android" },
        { label: "الرؤى", value: "مباشر" },
        { label: "نموذج الفوترة", value: "مساحة عمل" },
      ]
    : defaultHighlights;
  return (
    <main className="signin-shell">
      <div className="auth-locale-bar">
        <LocaleSwitcher />
      </div>
      <div className="signin-card">
        <div className="signin-left">
          <div>
            <Brand />
            <p style={{ marginTop: 32, fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.2, color: "var(--text)", maxWidth: 340 }}>
              {locale === "ar" ? "أنشئ مساحة عمل وابدأ في التقاط احتكاك الجوال." : "Create a workspace and start capturing mobile friction."}
            </p>
            <p className="subtext" style={{ marginTop: 14, fontSize: "0.9rem", maxWidth: 360 }}>
              {locale === "ar"
                ? "يجهز Maze مساحة العمل، ويصدر مفاتيح API، ويتيح لفريقك الانتقال من تثبيت الحزمة إلى الرؤية المباشرة بسرعة."
                : "Maze provisions your workspace, issues API keys, and lets your team move from SDK install to live insight quickly."}
            </p>
          </div>

          <div className="signin-stats">
            {highlights.map((item) => (
              <div className="signin-stat" key={item.label}>
                <p className="metric-label">{item.label}</p>
                <p className="metric-num" style={{ fontSize: "1.5rem" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="signin-right">
          <div>
            <div className="heading" style={{ marginBottom: 4 }}>{locale === "ar" ? "أنشئ مساحة Maze الخاصة بك" : "Create your Maze workspace"}</div>
            <p className="subtext" style={{ fontSize: "0.86rem" }}>{locale === "ar" ? "سنسجل دخولك مباشرة بعد إنشاء مساحة العمل." : "We&apos;ll sign you in right after the workspace is created."}</p>
          </div>

          <SignUpForm />

          <p style={{ fontSize: "0.8rem", color: "var(--text-3)", textAlign: "center" }}>
            {locale === "ar" ? "بإنشاء الحساب فإنك توافق على " : "By creating an account you agree to our "}
            <a href="/terms" style={{ color: "var(--text-2)" }}>{locale === "ar" ? "الشروط" : "Terms"}</a>
            {locale === "ar" ? " و" : " and "}
            <a href="/privacy" style={{ color: "var(--text-2)" }}>{locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
