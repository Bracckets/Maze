import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui";
import { getRequestLocale } from "@/lib/i18n-server";

const sections = [
  {
    title: "Using the service",
    body: "Maze may only be used on products you are authorized to instrument. You are responsible for ensuring your integration complies with your own privacy policy and applicable laws in the regions where your users reside.",
  },
  {
    title: "Prohibited data",
    body: "You agree not to send passwords, OTP codes, payment card details, national IDs, bank account numbers, or other regulated personal data through event metadata. Maze provides masking guidance and tooling, but compliance is your responsibility.",
  },
  {
    title: "Workspace responsibility",
    body: "You are responsible for managing workspace access, API key security, and the activity of any users you invite. Revoke access promptly when team members depart.",
  },
  {
    title: "Billing and renewal",
    body: "Paid plans renew automatically on the subscribed cadence unless canceled before the renewal date. Refunds are available within 7 days of an unintended renewal — contact support with your workspace ID.",
  },
  {
    title: "Service availability",
    body: "We aim for high uptime but do not guarantee uninterrupted access. We may perform maintenance or push updates at any time. Significant planned downtime will be communicated in advance.",
  },
  {
    title: "Termination",
    body: "Either party may terminate at any time. On termination, your data will be retained for 30 days before deletion, giving you time to export what you need.",
  },
  {
    title: "Changes to these terms",
    body: "We will notify workspace administrators by email before making material changes to these terms. Continued use after the effective date constitutes acceptance.",
  },
  {
    title: "Contact",
    body: "For terms questions, email legal@maze.ai.",
  },
];

export default async function TermsPage() {
  const locale = await getRequestLocale();
  return (
    <SiteShell>
      <section style={{ padding: "52px 0 40px", maxWidth: 640 }}>
        <p className="eyebrow">{locale === "ar" ? "شروط الخدمة" : "Terms of service"}</p>
        <h1 className="display-sm" style={{ marginBottom: 14 }}>
          {locale === "ar" ? "شروط واضحة" : "Straightforward terms"}<br />{locale === "ar" ? "لفرق تعمل بسرعة." : "for teams moving fast."}
        </h1>
        <p className="subtext" style={{ fontSize: "0.95rem" }}>
          {locale === "ar"
            ? "تغطي هذه الشروط كيفية الوصول إلى Maze واستخدامه، وما تقع مسؤوليته عليك، وكيف نتعامل مع الفوترة والبيانات."
            : "These terms cover how you access and use Maze, what you're responsible for, and how we handle billing and data. No legal jargon beyond what's necessary."}
        </p>
      </section>

      <Card style={{ marginBottom: 28 }}>
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
