import { DashboardShell } from "@/components/site-shell";
import { Panel, Pill } from "@/components/ui";
import { profileMoments } from "@/lib/site-data";

export default function ProfilePage() {
  return (
    <DashboardShell
      aside={
        <Panel>
          <Pill tone="light">Account health</Pill>
          <strong className="metric-value">Pro</strong>
          <p className="panel-copy">7 dashboards, 18 active experiments, and 2 linked mobile apps.</p>
        </Panel>
      }
      subtitle="Manage your personal workspace context, role, and collaboration settings."
      title="Profile"
    >
      <section className="profile-grid">
        <Panel glow>
          <div className="stack">
            <div className="avatar">AN</div>
            <div>
              <Pill tone="soft">Workspace owner</Pill>
              <h2 className="section-title">Amina Noor</h2>
              <p className="panel-copy">Leading the Maze rollout for onboarding, verification, and activation across the product org.</p>
            </div>
          </div>
          <div className="detail-grid">
            {profileMoments.map((item) => (
              <div className="detail-card" key={item.label}>
                <p className="mini-label">{item.label}</p>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <Pill>Edit profile</Pill>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input defaultValue="Amina Noor" id="name" />
            </div>
            <div className="field">
              <label htmlFor="title">Title</label>
              <input defaultValue="Principal Product Engineer" id="title" />
            </div>
            <div className="field">
              <label htmlFor="bio">Short bio</label>
              <textarea
                defaultValue="I use Maze to understand where onboarding breaks down and to turn friction into clear product actions."
                id="bio"
              />
            </div>
          </div>
        </Panel>
      </section>
    </DashboardShell>
  );
}
