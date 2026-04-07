import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui";
import { getRequestLocale } from "@/lib/i18n-server";

const sections = [
  {
    title: "What we collect",
    body: "Maze collects behavioral metadata: screen names, event names, timestamps, element identifiers, and aggregate interaction patterns. We also collect operational telemetry — SDK version, delivery status, and ingestion metrics — to keep the service reliable.",
  },
  {
    title: "What we do not collect",
    body: "Maze is not designed to receive passwords, OTP codes, credit card numbers, national IDs, or bank account numbers. These fields must be masked or omitted before any event leaves the user's device. If they appear in your event stream, that is a misconfiguration.",
  },
  {
    title: "How data is used",
    body: "Collected events are used solely to generate funnel analysis, friction detection, and AI insights for your workspace. We do not sell behavioral data to third parties or use it to train models outside your workspace context.",
  },
  {
    title: "Data retention",
    body: "Starter and Growth workspaces retain session data for 90 days. Scale plan customers can configure retention windows from 30 days to 1 year. Workspace administrators can request deletion at any time.",
  },
  {
    title: "Your controls",
    body: "Workspace administrators can export data, configure masking policies, and request account deletion from the Settings page. We aim to fulfill deletion requests within 30 days.",
  },
  {
    title: "Contact",
    body: "For privacy questions, email privacy@maze.ai. We respond to all requests within 5 business days.",
  },
];

export default async function PrivacyPage() {
  const locale = await getRequestLocale();
  return (
    <SiteShell>
      <section style={{ padding: "52px 0 40px", maxWidth: 640 }}>
        <p className="eyebrow">{locale === "ar" ? "سياسة الخصوصية" : "Privacy policy"}</p>
        <h1 className="display-sm" style={{ marginBottom: 14 }}>
          {locale === "ar" ? "مصمم لمراقبة السلوك،" : "Built to observe behavior,"}<br />{locale === "ar" ? "لا لكشف الهوية." : "not expose identity."}
        </h1>
        <p className="subtext" style={{ fontSize: "0.95rem" }}>
          {locale === "ar"
            ? "يلتقط Maze إشارات الاحتكاك لمساعدة فرق المنتج على تحسين تطبيقاتهم. لم يُصمم لجمع بيانات الاعتماد أو البيانات المالية أو المعلومات الشخصية."
            : "Maze captures friction signals to help product teams improve their apps. We are not designed to collect credentials, financial data, or personally identifiable information."}
        </p>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)", marginBottom: 28 }}>
        {[
          { label: "We collect", items: ["Screen and event names", "Timestamps and session IDs", "Element identifiers", "Delivery and SDK telemetry"] },
          { label: "We never collect", items: ["Passwords or OTP codes", "Card or bank account numbers", "National or government IDs", "Raw form field contents"] },
        ].map((col) => (
          <Card key={col.label} accent={col.label === "We never collect"}>
            <p style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 14 }}>
              {col.label}
            </p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
              {col.items.map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: "0.88rem", color: "var(--text-2)" }}>
                  <span style={{ color: col.label === "We never collect" ? "var(--red)" : "var(--green)", fontWeight: 700, fontSize: "0.78rem" }}>
                    {col.label === "We never collect" ? "✕" : "✓"}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card>
        <div className="legal-content">
          {sections.map((s) => (
            <div key={s.title}>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </SiteShell>
  );
}
