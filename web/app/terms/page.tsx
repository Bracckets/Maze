import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui";
import { getRequestLocale } from "@/lib/i18n-server";

const sections = [
  {
    title: "Using the service",
    body: "Pollex may only be used on products you are authorized to instrument. You are responsible for ensuring your integration complies with your own privacy policy and applicable laws.",
  },
  {
    title: "Prohibited data",
    body: "You agree not to send passwords, OTP codes, payment card details, national IDs, bank account numbers, or other regulated personal data through event metadata.",
  },
  {
    title: "Workspace responsibility",
    body: "You are responsible for managing workspace access, API key security, and the activity of any users you invite. Revoke access promptly when team members depart.",
  },
  {
    title: "Billing and renewal",
    body: "Paid plans renew automatically on the subscribed cadence unless canceled before the renewal date. Refunds are available within 7 days of an unintended renewal.",
  },
  {
    title: "Service availability",
    body: "We aim for high uptime but do not guarantee uninterrupted access. Maintenance or updates may happen at any time.",
  },
  {
    title: "Termination",
    body: "Either party may terminate at any time. On termination, your data is retained for 30 days before deletion so you have time to export what you need.",
  },
  {
    title: "Changes to these terms",
    body: "We notify workspace administrators by email before making material changes. Continued use after the effective date constitutes acceptance.",
  },
  {
    title: "Contact",
    body: "For terms questions, email legal@maze.ai.",
  },
] as const;

export default async function TermsPage() {
  const locale = await getRequestLocale();

  return (
    <SiteShell>
      <div className="pollex-page-stack">
        <section className="marketing-hero pollex-page-hero pollex-legal-intro">
          <p className="eyebrow">{locale === "ar" ? "ط´ط±ظˆط· ط§ظ„ط®ط¯ظ…ط©" : "Terms of service"}</p>
          <h1 className="display-sm">{locale === "ar" ? "ط´ط±ظˆط· ظˆط§ط¶ط­ط©" : "Straightforward terms for teams moving fast."}</h1>
          <p className="subtext">
            {locale === "ar"
              ? "طھط؛ط·ظٹ ظ‡ط°ظ‡ ط§ظ„ط´ط±ظˆط· ظƒظٹظپظٹط© ط§ظ„ظˆطµظˆظ„ ط¥ظ„ظ‰ Pollex ظˆط§ط³طھط®ط¯ط§ظ…ظ‡طŒ ظˆظ…ط§ طھظ‚ط¹ ظ…ط³ط¤ظˆظ„ظٹطھظ‡ ط¹ظ„ظٹظƒطŒ ظˆظƒظٹظپ ظ†طھط¹ط§ظ…ظ„ ظ…ط¹ ط§ظ„ظپظˆطھط±ط© ظˆط§ظ„ط¨ظٹط§ظ†ط§طھ."
              : "These terms cover how you access and use Pollex, what you are responsible for, and how billing and data handling work."}
          </p>
        </section>

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
