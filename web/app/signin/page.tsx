import { Brand } from "@/components/brand";
import { SignInForm } from "@/components/signin-form";
import { Panel, Pill } from "@/components/ui";

export default function SignInPage() {
  return (
    <main className="signin-shell">
      <div className="signin-card">
        <Panel className="signin-visual" glow>
          <div className="stack">
            <Brand />
            <Pill tone="light">Integration-ready sign in</Pill>
            <h1 className="panel-title">
              Sign in to the <span className="gradient-text">MVP workspace.</span>
            </h1>
            <p className="panel-copy">
              This form posts to <code>/api/auth/signin</code>. Point `MAZE_AUTH_SERVICE_URL` at your identity provider when you are
              ready to swap the mock handler for a real auth service.
            </p>
          </div>
          <div className="grid-floor">
            <span>Observe</span>
            <span>Infer</span>
            <span>Act</span>
          </div>
        </Panel>

        <Panel>
          <div className="stack">
            <Pill tone="soft">Workspace access</Pill>
            <SignInForm />
            <div className="clean-list">
              <article className="clean-item">
                <strong>Provider contract</strong>
                <span className="inline-note">POST /api/auth/signin</span>
              </article>
              <article className="clean-item">
                <strong>Expected credentials</strong>
                <span className="inline-note">email + password</span>
              </article>
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}
