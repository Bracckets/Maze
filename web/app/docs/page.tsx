import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui";
import { getRequestLocale } from "@/lib/i18n-server";

const sections = [
  {
    id: "liquid-workflow",
    title: "Liquid workflow",
    content: [
      {
        type: "p",
        text: "Liquid works best when you use it in this order: Keys, Rules, Staging, then Analytics.",
      },
      {
        type: "p",
        text: "1. Keys: define one stable content key, assign it to an observed Pollex screen, and set the default fallback text your app can always render.",
      },
      {
        type: "p",
        text: "2. Rules: define reusable traits, map each trait to a real source, then build profiles and profile-specific variants. Traits are not just labels anymore; they need a runtime source.",
      },
      {
        type: "p",
        text: "3. Staging: preview the actual resolved output, check readiness, and publish only when traits are live-safe and coverage looks healthy.",
      },
      {
        type: "p",
        text: "4. Analytics: measure fallback rate, profile match rate, trait coverage, and whether personalized variants outperform the default copy.",
      },
      {
        type: "p",
        text: "Liquid is fallback-first: the default copy is always safe, while personalization is additive and only goes live when the runtime inputs are resolvable.",
      },
      {
        type: "p",
        text: "Practical tip: keep trait sources explicit. App traits come from your app or backend, Pollex traits come from behavior, and manual-test traits stay in preview only.",
      },
    ],
  },
  {
    id: "quickstart",
    title: "Quick start",
    content: [
      {
        type: "p",
        text: "The fastest way to get started: sign in, hand your coding agent the POLLEX_INTEGRATION.md file from the repo, and it will wire Pollex analytics plus Liquid runtime bundles through one integration path.",
      },
      {
        type: "code",
        text: `# iOS - Swift Package Manager
https://github.com/pollex/ios-sdk

# Android - Gradle
implementation("com.pollex:sdk:1.0.0")

# Web - npm
npm install @pollex/sdk`,
      },
    ],
  },
  {
    id: "initialization",
    title: "Initialization",
    content: [
      {
        type: "p",
        text: "Initialize Pollex once at app launch in AppDelegate, your SwiftUI @main struct, or your Application subclass on Android. Use your workspace API key from the Settings page.",
      },
      {
        type: "code",
        text: `// iOS
import Pollex

Pollex.configure(
    PollexConfig(
        apiKey: "YOUR_API_KEY",
        endpoint: URL(string: "https://api.yourdomain.com/events")!,
        appVersion: "1.0.0",
        sessionCaptureEnabled: false
    )
)

// Android
import com.pollex.sdk.Pollex
import com.pollex.sdk.PollexConfig

Pollex.configure(
    PollexConfig(
        apiKey = "YOUR_API_KEY",
        endpoint = "https://api.yourdomain.com/events",
        appVersion = "1.0.0",
        application = this,
        sessionCaptureEnabled = false
    )
)

// Web
import { Pollex } from "@pollex/sdk";

Pollex.configure({
  apiKey: "YOUR_API_KEY",
  endpoint: "https://api.yourdomain.com/events",
  appVersion: "1.0.0",
  sessionCaptureEnabled: false,
});`,
      },
    ],
  },
  {
    id: "liquid-runtime",
    title: "Liquid runtime bundles",
    content: [
      {
        type: "p",
        text: "Define stable keys and observed-screen assignments in Pollex, then resolve a bundle at runtime with one request. Liquid returns text plus safe attributes like icon, visibility, emphasis, and ordering.",
      },
      {
        type: "code",
        text: `// iOS
Pollex.resolveLiquidBundle(
    screen: "checkout_paywall",
    locale: "en-US",
    subjectId: userId,
    traits: [
        "user.plan": "growth",
        "user.region": "na"
    ]
) { result in
    // render result.items
}

// Android
Pollex.resolveLiquidBundle(
    screen = "checkout_paywall",
    locale = "en-US",
    subjectId = userId,
    traits = mapOf(
        "user.plan" to "growth",
        "user.region" to "na"
    )
) { result ->
    // render result.getOrNull()?.items
}`,
      },
      {
        type: "p",
        text: "Pollex computes behavior traits like intent level or usage depth on the server. Your app should only send traits it already knows, such as plan, region, language, or account tier.",
      },
    ],
  },
  {
    id: "screen-tracking",
    title: "Screen tracking",
    content: [
      {
        type: "p",
        text: "Call Pollex.screen() when each screen becomes visible. Use lowercase snake_case names that match your route or view controller name.",
      },
      {
        type: "code",
        text: `// iOS - viewDidAppear or .onAppear
Pollex.screen("kyc_form")

// Android - onResume or LaunchedEffect
Pollex.screen("kyc_form")`,
      },
    ],
  },
  {
    id: "event-tracking",
    title: "Tracking taps and forms",
    content: [
      {
        type: "p",
        text: "Track CTA taps and form events. Never include raw sensitive values. Pass field identifiers only.",
      },
      {
        type: "code",
        text: `// Tap event
Pollex.track(event: "tap", screen: "kyc_form", elementId: "submit_button")

// Form submit
Pollex.track(event: "form_submit", screen: "kyc_form")

// Validation error
Pollex.track(event: "error_message", screen: "kyc_form", elementId: "email_field")`,
      },
    ],
  },
  {
    id: "data-safety",
    title: "Data safety",
    content: [
      {
        type: "p",
        text: "Never send raw values for passwords, OTP codes, card numbers, national IDs, or bank account numbers. Track field names only, not what the user typed.",
      },
    ],
  },
  {
    id: "backend",
    title: "Backend API",
    content: [
      {
        type: "p",
        text: "The Pollex backend exposes the following endpoints. Start it with `uvicorn app.main:app --reload` from the /backend directory.",
      },
      {
        type: "code",
        text: `POST /events                         # Ingest session events from SDKs
POST /liquid/runtime/bundles/resolve # Resolve a published Liquid bundle
POST /liquid/preview/bundles/resolve # Preview a draft Liquid bundle
GET  /liquid/integration-status      # Liquid onboarding and readiness summary
GET  /liquid/keys                    # Manage content keys
GET  /liquid/traits                  # Trait definitions and sources
GET  /liquid/profiles                # Reusable user profiles
GET  /liquid/bundles                 # Manage screen bundles
GET  /liquid/segments                # Audience segments
GET  /liquid/rules                   # Request rules
GET  /liquid/experiments             # Runtime experiments
GET  /insights                       # Friction insights
GET  /issues                         # Detected UX issues
GET  /sessions                       # Session list with metadata
GET  /health                         # Liveness check
GET  /ready                          # Readiness check (includes DB connectivity)`,
      },
    ],
  },
] as const;

const envVars = [
  { name: "NEXT_PUBLIC_API_BASE_URL", example: "http://127.0.0.1:8000", description: "Points the dashboard at your backend." },
  { name: "MAZE_AUTH_SERVICE_URL", example: "https://auth.yourapp.com", description: "Real identity provider for /api/auth/signin." },
  { name: "MAZE_API_KEYS_SERVICE_URL", example: "https://keys.yourapp.com", description: "Real key management service." },
  { name: "MAZE_WORKSPACE_SERVICE_URL", example: "https://workspace.yourapp.com", description: "Workspace settings backend." },
  { name: "MAZE_INTEGRATIONS_SERVICE_URL", example: "https://integrations.yourapp.com", description: "Integration status backend." },
] as const;

export default async function DocsPage() {
  const locale = await getRequestLocale();

  return (
    <SiteShell>
      <div className="pollex-page-stack">
        <section className="marketing-hero pollex-page-hero">
          <p className="eyebrow">{locale === "ar" ? "ط§ظ„طھظˆط«ظٹظ‚" : "Documentation"}</p>
          <h1 className="display">{locale === "ar" ? "ط§ظ†ط·ظ„ظ‚ ط¨ط³ط±ط¹ط©" : "Get up and running"}</h1>
          <p className="subtext">
            {locale === "ar"
              ? "طھظ… طھطµظ…ظٹظ… Pollex ظ„ظٹطھظ… ط¯ظ…ط¬ظ‡ ط¨ظˆط§ط³ط·ط© ط´ط®طµ ط£ظˆ ظˆظƒظٹظ„ ط¨ط±ظ…ط¬ظٹ. ط¯ظ„ظٹظ„ ط§ظ„ط¯ظ…ط¬ ط§ظ„ظƒط§ظ…ظ„ ظ…ظˆط¬ظˆط¯ ظپظٹ ظ…ظ„ظپ POLLEX_INTEGRATION.md ط¯ط§ط®ظ„ ط§ظ„ظ…ط³طھظˆط¯ط¹."
              : "Pollex is designed to be integrated by a human or a coding agent. The full integration guide lives in POLLEX_INTEGRATION.md in the repo."}
          </p>
          <div className="pollex-page-actions">
            <Link className="btn btn-primary btn-lg" href="/signin">
              {locale === "ar" ? "ط§ظپطھط­ ظ…ط³ط§ط­ط© ط§ظ„ط¹ظ…ظ„" : "Open workspace"}
            </Link>
            <Link className="btn btn-ghost btn-lg" href="/pricing">
              {locale === "ar" ? "ط´ط§ظ‡ط¯ ط§ظ„ط¨ط§ظ‚ط§طھ" : "See plans"}
            </Link>
          </div>
        </section>

        <div className="docs-layout">
          <nav className="docs-nav">
            <p className="eyebrow" style={{ padding: "0 10px", marginBottom: 8 }}>
              {locale === "ar" ? "ظپظٹ ظ‡ط°ظ‡ ط§ظ„طµظپط­ط©" : "On this page"}
            </p>
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="docs-nav-link">
                {section.title}
              </a>
            ))}
            <a href="#env" className="docs-nav-link">
              {locale === "ar" ? "ظ…طھط؛ظٹط±ط§طھ ط§ظ„ط¨ظٹط¦ط©" : "Environment vars"}
            </a>
          </nav>

          <div className="pollex-page-stack">
            {sections.map((section) => (
              <div className="docs-section" id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                {section.content.map((block, index) =>
                  block.type === "p" ? (
                    <p key={index}>{block.text}</p>
                  ) : (
                    <pre className="docs-code-block" key={index}>
                      {block.text}
                    </pre>
                  ),
                )}
              </div>
            ))}

            <div className="docs-section" id="env">
              <h2>{locale === "ar" ? "ظ…طھط؛ظٹط±ط§طھ ط§ظ„ط¨ظٹط¦ط©" : "Environment variables"}</h2>
              <p>
                {locale === "ar" ? "ط§ط¶ط¨ط· ظ‡ط°ظ‡ ط§ظ„ظ‚ظٹظ… ظپظٹ " : "Set these in your "}
                <code>.env.local</code> (web) {locale === "ar" ? "ط£ظˆ" : "or"} <code>.env</code> (backend).{" "}
                {locale === "ar" ? "ط§ظ†ط³ط®ظ‡ط§ ظ…ظ† ظ…ظ„ظپط§طھ" : "Copy from the"} <code>.env.example</code>{" "}
                {locale === "ar" ? "ظپظٹ ظƒظ„ ظ…ط¬ظ„ط¯." : "files in each directory."}
              </p>
              <Card style={{ marginTop: 14 }}>
                {envVars.map((item) => (
                  <div className="pollex-docs-env-row" key={item.name}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <code>{item.name}</code>
                    </div>
                    <p style={{ fontSize: "0.83rem", color: "var(--text-2)" }}>{item.description}</p>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                      e.g. {item.example}
                    </p>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
