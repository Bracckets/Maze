import { DashboardShell } from "@/components/site-shell";
import { PollexAppIcon } from "@/components/pollex-app-icon";
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
  const planName = user?.plan_name ?? (locale === "ar" ? "ط¸â€‍ط·آ§ ط·ع¾ط¸ث†ط·آ¬ط·آ¯ ط·آ¨ط·آ§ط¸â€ڑط·آ©" : "No plan");

  return (
    <DashboardShell
      activePath="/profile"
      title={locale === "ar" ? "ط·آ§ط¸â€‍ط¸â€¦ط¸â€‍ط¸ظ¾ ط·آ§ط¸â€‍ط·آ´ط·آ®ط·آµط¸ظ¹" : "Profile"}
      subtitle={locale === "ar" ? "ط·آ£ط·آ¯ط·آ± ط·ع¾ط¸ظ¾ط·آ§ط·آµط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط·آ­ط·آ³ط·آ§ط·آ¨ ط¸ث†ط·ع¾ط¸ظ¾ط·آ¶ط¸ظ¹ط¸â€‍ط·آ§ط·ع¾ ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ© ط·آ§ط¸â€‍ط·آ¹ط¸â€¦ط¸â€‍." : "Manage your account details and workspace preferences."}
    >
      <div className="pollex-account-grid">
        <div className="pollex-account-stack">
          <Card accent>
            <div className="pollex-profile-hero">
              <div className="pollex-avatar pollex-avatar-lg">{initials}</div>
              <div className="pollex-profile-hero-copy">
                <div className="pollex-profile-hero-title">
                  {user?.email ?? (locale === "ar" ? "ط·ع¾ط·آ³ط·آ¬ط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط·آ¯ط·آ®ط¸ث†ط¸â€‍ ط¸â€¦ط·آ·ط¸â€‍ط¸ث†ط·آ¨" : "Sign in required")}
                </div>
                <div className="subtext" style={{ fontSize: "0.85rem" }}>
                  {user?.workspace_name ?? (locale === "ar" ? "ط·آ¹ط·آ¶ط¸ث† ط¸ظ¾ط¸ظ¹ ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ© Pollex" : "Pollex workspace member")}
                </div>
              </div>
            </div>

            <div className="pollex-inline-tags">
              <Tag tone="accent">{locale === "ar" ? "ط¸â€¦ط·آ§ط¸â€‍ط¸ئ’ ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ© ط·آ§ط¸â€‍ط·آ¹ط¸â€¦ط¸â€‍" : "Workspace owner"}</Tag>
              <Tag tone="green">{planName}</Tag>
            </div>

            <p className="pollex-panel-intro">
              {user
                ? locale === "ar"
                  ? `ط¸â€،ط·آ°ط·آ§ ط·آ§ط¸â€‍ط·آ­ط·آ³ط·آ§ط·آ¨ ط¸ظ¹ط¸â€¦ط¸â€‍ط¸ئ’ ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ© ط·آ§ط¸â€‍ط·آ¹ط¸â€¦ط¸â€‍ ${user.workspace_name} ط¸ث†ط¸ظ¹ط¸â€¦ط¸ئ’ط¸â€ ط¸â€، ط·آ¥ط¸â€ ط·آ´ط·آ§ط·طŒ ط¸â€¦ط¸ظ¾ط·آ§ط·ع¾ط¸ظ¹ط·آ­ ط·آ§ط¸â€‍ط·آ¥ط·آ¯ط·آ®ط·آ§ط¸â€‍ ط¸â€‍ط·آ¥ط·آ¹ط·آ¯ط·آ§ط·آ¯ ط·آ§ط¸â€‍ط·آ­ط·آ²ط¸â€¦ط·آ©.`
                  : `This account owns the ${user.workspace_name} workspace and can generate ingestion keys for SDK setup.`
                : locale === "ar"
                  ? "ط·آ³ط·آ¬ط¸â€کط¸â€‍ ط·آ§ط¸â€‍ط·آ¯ط·آ®ط¸ث†ط¸â€‍ ط·آ¹ط·آ¨ط·آ± ط·ع¾ط·آ¯ط¸ظ¾ط¸â€ڑ ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ© ط·آ§ط¸â€‍ط·آ¹ط¸â€¦ط¸â€‍ ط¸â€‍ط·ع¾ط·آ­ط¸â€¦ط¸ظ¹ط¸â€‍ ط·ع¾ط¸ظ¾ط·آ§ط·آµط¸ظ¹ط¸â€‍ ط¸â€¦ط¸â€‍ط¸ظ¾ط¸ئ’ ط·آ§ط¸â€‍ط·آ´ط·آ®ط·آµط¸ظ¹."
                  : "Sign in through the workspace auth flow to load your profile details."}
            </p>
          </Card>

          <Card>
            <div className="pollex-section-heading" style={{ marginBottom: 16 }}>
              <span className="pollex-section-heading-icon" aria-hidden="true">
                <PollexAppIcon icon="workspace" />
              </span>
              <div className="heading">
                {locale === "ar" ? "ط·ع¾ط¸ظ¾ط·آ§ط·آµط¸ظ¹ط¸â€‍ ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ© ط·آ§ط¸â€‍ط·آ¹ط¸â€¦ط¸â€‍" : "Workspace details"}
              </div>
            </div>
            <div className="pollex-detail-grid">
              <div className="pollex-detail-card">
                <p className="metric-label">{locale === "ar" ? "ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ© ط·آ§ط¸â€‍ط·آ¹ط¸â€¦ط¸â€‍" : "Workspace"}</p>
                <strong>{user?.workspace_name ?? (locale === "ar" ? "ط·ط›ط¸ظ¹ط·آ± ط¸â€¦ط·ع¾ط·آ§ط·آ­" : "Unavailable")}</strong>
              </div>
              <div className="pollex-detail-card">
                <p className="metric-label">{locale === "ar" ? "ط¸â€¦ط·آ¹ط·آ±ط¸ظ¾ ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ© ط·آ§ط¸â€‍ط·آ¹ط¸â€¦ط¸â€‍" : "Workspace ID"}</p>
                <strong>{user?.workspace_id ?? (locale === "ar" ? "ط·ط›ط¸ظ¹ط·آ± ط¸â€¦ط·ع¾ط·آ§ط·آ­" : "Unavailable")}</strong>
              </div>
              <div className="pollex-detail-card">
                <p className="metric-label">{locale === "ar" ? "ط·آ§ط¸â€‍ط·آ¨ط·آ§ط¸â€ڑط·آ© ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط¸ظ¹ط·آ©" : "Current plan"}</p>
                <strong>{planName}</strong>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="pollex-section-heading" style={{ marginBottom: 4 }}>
            <span className="pollex-section-heading-icon" aria-hidden="true">
              <PollexAppIcon icon="profile" />
            </span>
            <div className="heading">{locale === "ar" ? "ط·ع¾ط·آ¹ط·آ¯ط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط¸â€¦ط¸â€‍ط¸ظ¾ ط·آ§ط¸â€‍ط·آ´ط·آ®ط·آµط¸ظ¹" : "Edit profile"}</div>
          </div>
          <p className="pollex-panel-intro">
            {locale === "ar"
              ? "ط·آ­ط·آ¯ط¸â€کط·آ« ط·آ§ط¸â€‍ط·آ¨ط·آ±ط¸ظ¹ط·آ¯ ط·آ§ط¸â€‍ط·آ¥ط¸â€‍ط¸ئ’ط·ع¾ط·آ±ط¸ث†ط¸â€ ط¸ظ¹ ط¸ث†ط·آ§ط·آ³ط¸â€¦ ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ© ط·آ§ط¸â€‍ط·آ¹ط¸â€¦ط¸â€‍ ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط·ع¾ط·آ¨ط·آ·ط¸ظ¹ط¸â€  ط·آ¨ط¸â€،ط·آ°ط¸â€، ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ©."
              : "Update the account email and workspace name tied to this Pollex workspace."}
          </p>
          {user ? (
            <ProfileEditor initialEmail={user.email} initialWorkspaceName={user.workspace_name} />
          ) : (
            <div className="pollex-form-stack">
              <div className="field">
                <label htmlFor="email">{locale === "ar" ? "ط·آ§ط¸â€‍ط·آ¨ط·آ±ط¸ظ¹ط·آ¯ ط·آ§ط¸â€‍ط·آ¥ط¸â€‍ط¸ئ’ط·ع¾ط·آ±ط¸ث†ط¸â€ ط¸ظ¹" : "Email address"}</label>
                <input defaultValue="" id="email" readOnly />
              </div>
            </div>
          )}

          <div className="pollex-form-stack" style={{ marginTop: 20 }}>
            <div className="field">
              <label htmlFor="workspace-id">{locale === "ar" ? "ط¸â€¦ط·آ¹ط·آ±ط¸ظ¾ ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ© ط·آ§ط¸â€‍ط·آ¹ط¸â€¦ط¸â€‍" : "Workspace ID"}</label>
              <input defaultValue={user?.workspace_id ?? ""} id="workspace-id" readOnly />
            </div>
            {user ? <SignOutButton /> : null}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
