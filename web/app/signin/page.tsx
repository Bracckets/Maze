import Link from "next/link";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignInForm } from "@/components/signin-form";
import { getRequestLocale } from "@/lib/i18n-server";

const defaultStats = [
  { label: "Sessions analyzed", value: "4.2M" },
  { label: "Time to insight", value: "6 min" },
  { label: "Recovered drop-offs", value: "31%" },
] as const;

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
          <div className="pollex-auth-copy">
            <p className="eyebrow">{isArabic ? "ط§ظ„ط¹ظˆط¯ط© ط¥ظ„ظ‰ ظ…ط³ط§ط­ط© ط§ظ„ط¹ظ…ظ„" : "Return to the workspace"}</p>
            <h1 className="display-sm">{isArabic ? "ط³ط¬ظ‘ظ„ ط§ظ„ط¯ط®ظˆظ„ ط¥ظ„ظ‰ ظˆط§ط¬ظ‡ط© Pollex." : "Sign back into the Pollex workspace."}</h1>
            <p className="subtext">
              {isArabic
                ? "ط§ظ„ط®ط±ط§ط¦ط· ط§ظ„ط­ط±ط§ط±ظٹط©طŒ ط§ظ„ط¬ظ„ط³ط§طھطŒ ظˆط­ط§ظ„ط© ط§ظ„طھظƒط§ظ…ظ„ ط¬ط§ظ‡ط²ط© ط¹ظ†ط¯ ط§ظ„ط¯ط®ظˆظ„."
                : "Heatmaps, session streams, and integration health are ready when you return. The workspace stays quiet and keeps the important decisions obvious."}
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
          <div className="pollex-auth-copy">
            <p className="eyebrow">{isArabic ? "طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„" : "Sign in"}</p>
            <h2 className="display-sm" style={{ fontSize: "2.1rem" }}>
              {isArabic ? "ط§ط¯ط®ظ„ ط¥ظ„ظ‰ ظ…ط³ط§ط­ط© Pollex" : "Enter your Pollex workspace"}
            </h2>
            <p className="subtext">
              {isArabic ? "ط§ط³طھط®ط¯ظ… ط¨ظٹط§ظ†ط§طھ ط§ظ„ط§ط¹طھظ…ط§ط¯ ظ„ظ„ط¹ظˆط¯ط© ظ…ط¨ط§ط´ط±ط© ط¥ظ„ظ‰ ظ„ظˆط­ط© ط§ظ„ط¥ط´ط§ط±ط©." : "Use your workspace credentials to return directly to the signal surface."}
            </p>
          </div>

          <div style={{ marginTop: 24 }}>
            <SignInForm />
          </div>

          <p className="pollex-auth-legal" style={{ marginTop: 24 }}>
            {isArabic ? "ط¨طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ظپط¥ظ†ظƒ طھظˆط§ظپظ‚ ط¹ظ„ظ‰ " : "By signing in you agree to our "}
            <Link href="/terms">{isArabic ? "ط§ظ„ط´ط±ظˆط·" : "Terms"}</Link>{" "}
            {isArabic ? "ظˆ" : "and "}
            <Link href="/privacy">{isArabic ? "ط³ظٹط§ط³ط© ط§ظ„ط®طµظˆطµظٹط©" : "Privacy Policy"}</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
