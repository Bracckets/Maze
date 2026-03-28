import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { Card, Tag } from "@/components/ui";

const sections = [
  {
    id: "quickstart",
    title: "Quick start",
    content: [
      {
        type: "p",
        text: "The fastest way to get started: sign in, hand your coding agent the MAZE_INTEGRATION.md file from the repo, and it will instrument your app automatically.",
      },
      {
        type: "code",
        text: `# iOS — Swift Package Manager
https://github.com/maze/ios-sdk

# Android — Gradle
implementation("com.maze:sdk:1.0.0")`,
      },
    ],
  },
  {
    id: "initialization",
    title: "Initialization",
    content: [
      {
        type: "p",
        text: "Initialize Maze once at app launch — in AppDelegate, your SwiftUI @main struct, or your Application subclass on Android. Use your workspace API key from the Settings page.",
      },
      {
        type: "code",
        text: `// iOS
import Maze
Maze.initialize(apiKey: "YOUR_API_KEY")

// Android
Maze.initialize(context, "YOUR_API_KEY")`,
      },
    ],
  },
  {
    id: "screen-tracking",
    title: "Screen tracking",
    content: [
      {
        type: "p",
        text: "Call Maze.screen() when each screen becomes visible. Use lowercase snake_case names that match your route or view controller name.",
      },
      {
        type: "code",
        text: `// iOS — viewDidAppear or .onAppear
Maze.screen("kyc_form")

// Android — onResume or LaunchedEffect
Maze.screen("kyc_form")`,
      },
    ],
  },
  {
    id: "event-tracking",
    title: "Tracking taps & forms",
    content: [
      {
        type: "p",
        text: "Track CTA taps and form events. Never include raw sensitive values — pass field identifiers only.",
      },
      {
        type: "code",
        text: `// Tap event
Maze.track(event: "tap", screen: "kyc_form", elementId: "submit_button")

// Form submit
Maze.track(event: "form_submit", screen: "kyc_form")

// Validation error
Maze.track(event: "error_message", screen: "kyc_form", elementId: "email_field")`,
      },
    ],
  },
  {
    id: "data-safety",
    title: "Data safety",
    content: [
      {
        type: "p",
        text: "Never send raw values for passwords, OTP codes, card numbers, national IDs, or bank account numbers. Track field names only — not what the user typed.",
      },
    ],
  },
  {
    id: "backend",
    title: "Backend API",
    content: [
      {
        type: "p",
        text: "The Maze backend exposes the following endpoints. Start it with `uvicorn app.main:app --reload` from the /backend directory.",
      },
      {
        type: "code",
        text: `POST /events      # Ingest session events from SDKs
GET  /insights    # AI-generated friction insights
GET  /issues      # Detected UX issues
GET  /sessions    # Session list with metadata
GET  /health      # Liveness check
GET  /ready       # Readiness check (includes DB connectivity)`,
      },
    ],
  },
];

const envVars = [
  { name: "NEXT_PUBLIC_API_BASE_URL",      example: "http://127.0.0.1:8000",       description: "Points the dashboard at your backend." },
  { name: "MAZE_AUTH_SERVICE_URL",         example: "https://auth.yourapp.com",    description: "Real identity provider for /api/auth/signin." },
  { name: "MAZE_API_KEYS_SERVICE_URL",     example: "https://keys.yourapp.com",    description: "Real key management service." },
  { name: "MAZE_WORKSPACE_SERVICE_URL",    example: "https://workspace.yourapp.com", description: "Workspace settings backend." },
  { name: "MAZE_INTEGRATIONS_SERVICE_URL", example: "https://integrations.yourapp.com", description: "Integration status backend." },
];

export default function DocsPage() {
  return (
    <SiteShell>
      <section className="marketing-hero" style={{ paddingBottom: 36 }}>
        <p className="eyebrow">Documentation</p>
        <h1 className="display" style={{ marginBottom: 16 }}>
          Get up and running<br />
          <span className="gradient-text">in under 10 minutes.</span>
        </h1>
        <p className="subtext" style={{ fontSize: "1rem", maxWidth: 480, marginBottom: 24 }}>
          Maze is designed to be integrated by a human or a coding agent. The full integration guide
          lives in MAZE_INTEGRATION.md in the repo.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Link className="btn btn-primary btn-lg" href="/signin">Open workspace</Link>
          <Link className="btn btn-ghost btn-lg" href="/pricing">See plans</Link>
        </div>
      </section>

      <div className="docs-layout">
        {/* Sidebar nav */}
        <nav className="docs-nav">
          <p style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", padding: "0 10px", marginBottom: 8 }}>
            On this page
          </p>
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="docs-nav-link">{s.title}</a>
          ))}
          <a href="#env" className="docs-nav-link">Environment vars</a>
        </nav>

        {/* Main content */}
        <div>
          {sections.map((section) => (
            <div className="docs-section" id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              {section.content.map((block, i) =>
                block.type === "p" ? (
                  <p key={i}>{block.text}</p>
                ) : (
                  <pre className="docs-code-block" key={i}>{block.text}</pre>
                )
              )}
            </div>
          ))}

          {/* Env vars table */}
          <div className="docs-section" id="env">
            <h2>Environment variables</h2>
            <p>Set these in your <code>.env.local</code> (web) or <code>.env</code> (backend). Copy from the <code>.env.example</code> files in each directory.</p>
            <Card style={{ marginTop: 14 }}>
              {envVars.map((v, i) => (
                <div
                  key={v.name}
                  style={{
                    padding: "14px 0",
                    borderBottom: i < envVars.length - 1 ? "1px solid var(--border)" : "none",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <code>{v.name}</code>
                  </div>
                  <p style={{ fontSize: "0.83rem", color: "var(--text-2)" }}>{v.description}</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>e.g. {v.example}</p>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
