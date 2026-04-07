import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignInForm } from "@/components/signin-form";
import { getRequestLocale } from "@/lib/i18n-server";

const defaultStats = [
  { label: "Sessions analyzed", value: "4.2M" },
  { label: "Avg. time to insight", value: "6 min" },
  { label: "Drop-offs recovered", value: "31%" },
  { label: "Delivery uptime", value: "99.8%" },
];

export default async function SignInPage() {
  const locale = await getRequestLocale();
  const stats = locale === "ar"
    ? [
        { label: "الجلسات المحللة", value: "4.2M" },
        { label: "متوسط الوصول للرؤية", value: "6 دقائق" },
        { label: "الانسحابات المستعادة", value: "31%" },
        { label: "توفر الخدمة", value: "99.8%" },
      ]
    : defaultStats;
  return (
    <main className="signin-shell">
      <div className="auth-locale-bar">
        <LocaleSwitcher />
      </div>
      <div className="signin-card">
        {/* Left panel */}
        <div className="signin-left">
          <div>
            <Brand />
            <p
              style={{
                marginTop: 32,
                fontSize: "1.5rem",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
                color: "var(--text)",
                maxWidth: 340,
              }}
            >
              {locale === "ar" ? "افهم لماذا يتوقف المستخدمون قبل أن يكملوا." : "Understand why users stop before they finish."}
            </p>
            <p
              className="subtext"
              style={{ marginTop: 14, fontSize: "0.9rem", maxWidth: 360 }}
            >
              {locale === "ar"
                ? "يراقب Maze كل جلسة ويكشف الاحتكاك الذي لا يعرف فريقك بوجوده."
                : "Maze watches every session and surfaces the friction your team doesn't know is there."}
            </p>
          </div>

          <div className="signin-stats">
            {stats.map((s) => (
              <div className="signin-stat" key={s.label}>
                <p className="metric-label">{s.label}</p>
                <p className="metric-num" style={{ fontSize: "1.5rem" }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="signin-right">
          <div>
            <div className="heading" style={{ marginBottom: 4 }}>
              {locale === "ar" ? "سجّل الدخول إلى Maze" : "Sign in to Maze"}
            </div>
            <p className="subtext" style={{ fontSize: "0.86rem" }}>
              {locale === "ar" ? "أدخل بيانات مساحة العمل للمتابعة." : "Enter your workspace credentials to continue."}
            </p>
          </div>

          <SignInForm />

          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-3)",
              textAlign: "center",
            }}
          >
            {locale === "ar" ? "بتسجيل الدخول فإنك توافق على " : "By signing in you agree to our "}
            <a href="/terms" style={{ color: "var(--text-2)" }}>
              {locale === "ar" ? "الشروط" : "Terms"}
            </a>{" "}
            {locale === "ar" ? "و" : "and "}
            <a href="/privacy" style={{ color: "var(--text-2)" }}>
              {locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
            </a>
            {locale === "ar" ? "." : "."}
          </p>
        </div>
      </div>
    </main>
  );
}
