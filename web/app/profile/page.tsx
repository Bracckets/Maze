import { DashboardShell } from "@/components/site-shell";
import { ProfileEditor } from "@/components/profile-editor";
import { SignOutButton } from "@/components/signout-button";
import { Card, Tag } from "@/components/ui";
import { getCurrentUser } from "@/lib/service-gateway";

export default async function ProfilePage() {
  const me = await getCurrentUser();
  const user = "user" in me.data ? me.data.user : null;
  const initials = user?.email.slice(0, 2).toUpperCase() ?? "NA";
  const planName = user?.plan_name ?? "No plan";

  return (
    <DashboardShell
      title="Profile"
      subtitle="Manage your account details and workspace preferences."
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <Card accent>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div className="avatar avatar-lg">{initials}</div>
              <div>
                <div className="heading" style={{ fontSize: "1.15rem" }}>{user?.email ?? "Sign in required"}</div>
                <div className="subtext" style={{ fontSize: "0.85rem" }}>{user?.workspace_name ?? "Maze workspace member"}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <Tag tone="accent">Workspace owner</Tag>
              <Tag tone="green">{planName}</Tag>
            </div>

            <p className="subtext" style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 20 }}>
              {user
                ? `This account owns the ${user.workspace_name} workspace and can generate ingestion keys for SDK setup.`
                : "Sign in through the workspace auth flow to load your profile details."}
            </p>
          </Card>

          <Card>
            <div className="heading" style={{ marginBottom: 16 }}>Workspace details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: "12px 14px", border: "1px solid var(--border)" }}>
                <p className="metric-label">Workspace</p>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginTop: 2 }}>{user?.workspace_name ?? "Unavailable"}</p>
              </div>
              <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: "12px 14px", border: "1px solid var(--border)" }}>
                <p className="metric-label">Workspace ID</p>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginTop: 2 }}>{user?.workspace_id ?? "Unavailable"}</p>
              </div>
              <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: "12px 14px", border: "1px solid var(--border)" }}>
                <p className="metric-label">Current plan</p>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginTop: 2 }}>{planName}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="heading" style={{ marginBottom: 4 }}>Edit profile</div>
          <p className="subtext" style={{ fontSize: "0.85rem", marginBottom: 22 }}>
            Update the account email and workspace name tied to this Maze workspace.
          </p>
          {user ? (
            <ProfileEditor initialEmail={user.email} initialWorkspaceName={user.workspace_name} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input defaultValue="" id="email" readOnly />
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
            <div className="field">
              <label htmlFor="workspace-id">Workspace ID</label>
              <input defaultValue={user?.workspace_id ?? ""} id="workspace-id" readOnly />
            </div>
            {user ? <SignOutButton /> : null}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
