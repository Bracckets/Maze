import { DashboardShell } from "@/components/site-shell";
import { Card, Tag } from "@/components/ui";
import { profileMoments } from "@/lib/site-data";

const activity = [
  { label: "Active experiments",  value: "18" },
  { label: "Linked mobile apps",  value: "2" },
  { label: "Dashboards created",  value: "7" },
  { label: "Insights acted on",   value: "43" },
];

export default function ProfilePage() {
  return (
    <DashboardShell
      title="Profile"
      subtitle="Manage your account details and workspace preferences."
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>

        {/* Left: identity card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <Card accent>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div className="avatar avatar-lg">AN</div>
              <div>
                <div className="heading" style={{ fontSize: "1.15rem" }}>Amina Noor</div>
                <div className="subtext" style={{ fontSize: "0.85rem" }}>Principal Product Engineer</div>
              </div>
            </div>

            <Tag tone="accent" style={{ marginBottom: 16 }}>Workspace owner</Tag>

            <p className="subtext" style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 20 }}>
              Leading the Maze rollout across onboarding, verification, and activation flows for the Growth Platform team.
            </p>

            <div className="divider" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              {profileMoments.map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: "var(--surface-2)",
                    borderRadius: "var(--r-md)",
                    padding: "12px 14px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p className="metric-label">{item.label}</p>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginTop: 2 }}>{item.value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Activity */}
          <Card>
            <div className="heading" style={{ marginBottom: 16 }}>Workspace activity</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {activity.map((a) => (
                <div
                  key={a.label}
                  style={{
                    background: "var(--surface-2)",
                    borderRadius: "var(--r-md)",
                    padding: "12px 14px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p className="metric-label">{a.label}</p>
                  <p className="metric-num" style={{ fontSize: "1.5rem" }}>{a.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: edit form */}
        <Card>
          <div className="heading" style={{ marginBottom: 4 }}>Edit profile</div>
          <p className="subtext" style={{ fontSize: "0.85rem", marginBottom: 22 }}>
            Updates apply to your workspace profile and collaboration context.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input defaultValue="Amina Noor" id="name" />
              </div>
              <div className="field">
                <label htmlFor="title">Job title</label>
                <input defaultValue="Principal Product Engineer" id="title" />
              </div>
            </div>

            <div className="field">
              <label htmlFor="email">Email address</label>
              <input defaultValue="amina@company.com" id="email" type="email" />
            </div>

            <div className="field">
              <label htmlFor="team">Team</label>
              <input defaultValue="Growth Platform" id="team" />
            </div>

            <div className="field">
              <label htmlFor="bio">Short bio</label>
              <textarea
                defaultValue="I use Maze to understand where onboarding breaks down and turn friction into clear product actions."
                id="bio"
                rows={4}
              />
            </div>

            <div className="divider" />

            <button
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", height: 44 }}
              type="button"
            >
              Save changes
            </button>
          </div>
        </Card>

      </div>
    </DashboardShell>
  );
}
