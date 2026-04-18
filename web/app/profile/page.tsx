import { DashboardShell } from "@/components/site-shell";
import { ProfileEditor } from "@/components/profile-editor";
import { SignOutButton } from "@/components/signout-button";
import { Card, Tag } from "@/components/ui";
import { getRequestLocale } from "@/lib/i18n-server";
import { getCurrentUser } from "@/lib/service-gateway";

export default async function ProfilePage() {
  const locale = await getRequestLocale();
  const me = await getCurrentUser();
  const user = "user" in me.data ? me.data.user : null;
  const initials = user?.email.slice(0, 2).toUpperCase() ?? "PL";
  const planName = user?.plan_name ?? (locale === "ar" ? "لا توجد باقة" : "No plan");

  return (
    <DashboardShell
      activePath="/profile"
      title={locale === "ar" ? "الملف الشخصي" : "Profile"}
      subtitle={locale === "ar" ? "أدر تفاصيل الحساب وتفضيلات مساحة العمل." : "Manage your account details and workspace preferences."}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <Card accent>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div className="avatar avatar-lg">{initials}</div>
              <div>
                <div className="heading" style={{ fontSize: "1.15rem" }}>
                  {user?.email ?? (locale === "ar" ? "تسجيل الدخول مطلوب" : "Sign in required")}
                </div>
                <div className="subtext" style={{ fontSize: "0.85rem" }}>
                  {user?.workspace_name ?? (locale === "ar" ? "عضو في مساحة Pollex" : "Pollex workspace member")}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <Tag tone="accent">{locale === "ar" ? "مالك مساحة العمل" : "Workspace owner"}</Tag>
              <Tag tone="green">{planName}</Tag>
            </div>

            <p className="subtext" style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 20 }}>
              {user
                ? locale === "ar"
                  ? `هذا الحساب يملك مساحة العمل ${user.workspace_name} ويمكنه إنشاء مفاتيح الإدخال لإعداد الحزمة.`
                  : `This account owns the ${user.workspace_name} workspace and can generate ingestion keys for SDK setup.`
                : locale === "ar"
                  ? "سجّل الدخول عبر تدفق مساحة العمل لتحميل تفاصيل ملفك الشخصي."
                  : "Sign in through the workspace auth flow to load your profile details."}
            </p>
          </Card>

          <Card>
            <div className="heading" style={{ marginBottom: 16 }}>
              {locale === "ar" ? "تفاصيل مساحة العمل" : "Workspace details"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: "12px 14px", border: "1px solid var(--border)" }}>
                <p className="metric-label">{locale === "ar" ? "مساحة العمل" : "Workspace"}</p>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginTop: 2 }}>
                  {user?.workspace_name ?? (locale === "ar" ? "غير متاح" : "Unavailable")}
                </p>
              </div>
              <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: "12px 14px", border: "1px solid var(--border)" }}>
                <p className="metric-label">{locale === "ar" ? "معرف مساحة العمل" : "Workspace ID"}</p>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginTop: 2 }}>
                  {user?.workspace_id ?? (locale === "ar" ? "غير متاح" : "Unavailable")}
                </p>
              </div>
              <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: "12px 14px", border: "1px solid var(--border)" }}>
                <p className="metric-label">{locale === "ar" ? "الباقة الحالية" : "Current plan"}</p>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginTop: 2 }}>{planName}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="heading" style={{ marginBottom: 4 }}>{locale === "ar" ? "تعديل الملف الشخصي" : "Edit profile"}</div>
          <p className="subtext" style={{ fontSize: "0.85rem", marginBottom: 22 }}>
            {locale === "ar"
              ? "حدّث البريد الإلكتروني واسم مساحة العمل المرتبطين بهذه المساحة."
              : "Update the account email and workspace name tied to this Pollex workspace."}
          </p>
          {user ? (
            <ProfileEditor initialEmail={user.email} initialWorkspaceName={user.workspace_name} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label htmlFor="email">{locale === "ar" ? "البريد الإلكتروني" : "Email address"}</label>
                <input defaultValue="" id="email" readOnly />
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
            <div className="field">
              <label htmlFor="workspace-id">{locale === "ar" ? "معرف مساحة العمل" : "Workspace ID"}</label>
              <input defaultValue={user?.workspace_id ?? ""} id="workspace-id" readOnly />
            </div>
            {user ? <SignOutButton /> : null}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
