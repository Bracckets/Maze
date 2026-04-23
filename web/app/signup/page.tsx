import Link from "next/link";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignUpForm } from "@/components/signup-form";
import { getRequestLocale } from "@/lib/i18n-server";

const defaultHighlights = [
  { label: "Setup time", value: "10 min" },
  { label: "SDKs included", value: "iOS + Android" },
  { label: "Billing model", value: "Workspace" },
] as const;

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
          <div className="pollex-auth-copy">
            <p className="eyebrow">{isArabic ? "ط¥ط·ظ„ط§ظ‚ ط³ط±ظٹط¹" : "Fast launch"}</p>
            <h1 className="display-sm">{isArabic ? "ط£ظ†ط´ط¦ ظ…ط³ط§ط­ط© Pollex ظˆط§ط¨ط¯ط£ ط¬ظ…ط¹ ط§ظ„ط¥ط´ط§ط±ط©." : "Create a Pollex workspace and start collecting signal."}</h1>
            <p className="subtext">
              {isArabic
                ? "ط§ظ„طھط¯ظپظ‚ ط§ظ„ط¬ط¯ظٹط¯ ظٹظ‚ظ„ظ„ ط§ظ„ط¶ط¬ظٹط¬ ظˆظٹط¬ط¹ظ„ ط§ظ„ط®ط·ظˆط© ط§ظ„ط£ظˆظ„ظ‰ ط£ظˆط¶ط­."
                : "The onboarding flow trims setup noise and keeps the first step obvious so you can move straight into the workspace."}
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
          <div className="pollex-auth-copy">
            <p className="eyebrow">{isArabic ? "ط¥ظ†ط´ط§ط، ظ…ط³ط§ط­ط© ط¹ظ…ظ„" : "Create workspace"}</p>
            <h2 className="display-sm" style={{ fontSize: "2.1rem" }}>
              {isArabic ? "ط§ط¨ط¯ط£ ظ…ط³ط§ط­ط© Pollex ط§ظ„ط¬ط¯ظٹط¯ط©" : "Start your Pollex workspace"}
            </h2>
            <p className="subtext">
              {isArabic ? "ظ†ظ†ط´ط¦ ظ„ظƒ ط§ظ„ط­ط³ط§ط¨ ظˆظ†ط£ط®ط°ظƒ ظ…ط¨ط§ط´ط±ط© ط¥ظ„ظ‰ ط§ظ„ط³ط·ط­ ط§ظ„طھط´ط؛ظٹظ„ظٹ." : "We create the account, provision the workspace, and route you straight into the operating surface."}
            </p>
          </div>

          <div style={{ marginTop: 24 }}>
            <SignUpForm />
          </div>

          <p className="pollex-auth-legal" style={{ marginTop: 24 }}>
            {isArabic ? "ط¨ط¥ظ†ط´ط§ط، ط§ظ„ط­ط³ط§ط¨ ظپط¥ظ†ظƒ طھظˆط§ظپظ‚ ط¹ظ„ظ‰ " : "By creating an account you agree to our "}
            <Link href="/terms">{isArabic ? "ط§ظ„ط´ط±ظˆط·" : "Terms"}</Link>{" "}
            {isArabic ? "ظˆ" : "and "}
            <Link href="/privacy">{isArabic ? "ط³ظٹط§ط³ط© ط§ظ„ط®طµظˆطµظٹط©" : "Privacy Policy"}</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
