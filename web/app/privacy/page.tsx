import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui";
import { getRequestLocale } from "@/lib/i18n-server";

const sections = [
  {
    title: "What we collect",
    body: "Pollex collects behavioral metadata: screen names, event names, timestamps, element identifiers, and aggregate interaction patterns. We also collect operational telemetry to keep the service reliable.",
  },
  {
    title: "What we do not collect",
    body: "Pollex is not designed to receive passwords, OTP codes, credit card numbers, national IDs, or bank account numbers. These fields must be masked or omitted before any event leaves the user's device.",
  },
  {
    title: "How data is used",
    body: "Collected events are used solely to generate funnel analysis, friction detection, and workspace-specific insights. We do not sell behavioral data to third parties.",
  },
  {
    title: "Data retention",
    body: "Starter and Growth workspaces retain session data for 90 days. Scale workspaces can configure retention windows from 30 days to 1 year.",
  },
  {
    title: "Your controls",
    body: "Workspace administrators can export data, configure masking policies, and request account deletion from the Settings page.",
  },
  {
    title: "Contact",
    body: "For privacy questions, email privacy@maze.ai.",
  },
] as const;

const quickFacts = [
  {
    title: "We collect",
    items: ["Screen and event names", "Timestamps and session IDs", "Element identifiers", "Delivery and SDK telemetry"],
  },
  {
    title: "We never collect",
    items: ["Passwords or OTP codes", "Card or bank account numbers", "National or government IDs", "Raw form field contents"],
  },
] as const;

export default async function PrivacyPage() {
  const locale = await getRequestLocale();

  return (
    <SiteShell>
      <div className="pollex-page-stack">
        <section className="marketing-hero pollex-page-hero pollex-legal-intro">
          <p className="eyebrow">{locale === "ar" ? "ط³ظٹط§ط³ط© ط§ظ„ط®طµظˆطµظٹط©" : "Privacy policy"}</p>
          <h1 className="display-sm">{locale === "ar" ? "ظ…ط¨ظ†ظٹ ظ„ظ…ط±ط§ظ‚ط¨ط© ط§ظ„ط³ظ„ظˆظƒ" : "Built to observe behavior, not identity."}</h1>
          <p className="subtext">
            {locale === "ar"
              ? "ظٹظ„طھظ‚ط· Pollex ط¥ط´ط§ط±ط§طھ ط§ظ„ط§ط­طھظƒط§ظƒ ظ„ظ…ط³ط§ط¹ط¯ط© ظپط±ظ‚ ط§ظ„ظ…ظ†طھط¬ ط¹ظ„ظ‰ طھط­ط³ظٹظ† طھط·ط¨ظٹظ‚ط§طھظ‡ظ…. ظ„ظ… ظٹطµظ…ظ… ظ„ط¬ظ…ط¹ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط­ط³ط§ط³ط©."
              : "Pollex captures friction signals to help product teams improve their apps. It is not designed to collect credentials, financial data, or sensitive personal identifiers."}
          </p>
        </section>

        <div className="pollex-inline-grid-2">
          {quickFacts.map((fact) => (
            <Card key={fact.title} accent={fact.title === "We never collect"}>
              <p className="eyebrow" style={{ marginBottom: 14 }}>{fact.title}</p>
              <ul className="pollex-checklist">
                {fact.items.map((item) => (
                  <li key={item}>
                    <span className="pollex-checklist-marker">{fact.title === "We never collect" ? "x" : "+"}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <Card className="legal-content">
          <div className="pollex-legal-content">
            {sections.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </section>
            ))}
          </div>
        </Card>
      </div>
    </SiteShell>
  );
}
