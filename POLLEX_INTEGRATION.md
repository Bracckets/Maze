# POLLEX_INTEGRATION

Follow this document when integrating Pollex into a host app.
This file is an agent runbook, not just a product note.
It should give enough detail for an agent to install, configure, run, verify, and troubleshoot Pollex in iOS, Android, or web clients without inventing missing steps.

Pollex covers two connected responsibilities:

1. Behavior telemetry and optional session capture
2. Liquid runtime bundle resolution for app content

The goal is one coherent Pollex setup, not separate telemetry and Liquid integrations.

## Agent run checklist

When using this file, the agent should:

1. confirm which host platform is being integrated: iOS, Android, web, or more than one
2. confirm the backend `/events` endpoint the client can actually reach
3. confirm a valid workspace API key exists for ingestion and Liquid runtime requests
4. configure Pollex once in app bootstrap code
5. add explicit `screen` and `track` calls for the target flow
6. wire one `resolveLiquidBundle` call for a real screen
7. verify traffic reaches `/events`, `/screenshots` when enabled, and `/liquid/runtime/bundles/resolve`
8. fall back to app-local content if runtime resolve fails
9. keep session capture off unless the host app satisfies disclosure and consent requirements

## Core integration contract

At runtime the app should:

1. configure Pollex once at launch
2. continue sending telemetry with `Pollex.screen(...)` and `Pollex.track(...)`
3. identify a screen using a stable `screenKey`
4. resolve one Liquid bundle for that screen
5. pass stable app or account traits when available
6. render the returned content or fall back to local defaults

Developers should only need to do four app-specific things:

- define stable screen identifiers
- define stable content keys in UI code
- pass stable identity or account traits that the app already knows
- map returned Liquid content to existing UI labels and safe attributes

Pollex computes behavior traits on the server. The app should not try to recreate those client-side.

## Compliance first

Pollex session capture remains optional.

Default rules:

- telemetry is allowed after the host app configures Pollex
- screen capture is off by default
- screen capture may only be enabled after explicit user consent and visible in-app disclosure

Never enable capture by default on:

- login
- signup
- otp_verification
- password_reset
- payment
- kyc_id_upload

## 1. Install the Pollex SDK

### iOS

Use Swift Package Manager:

```text
https://github.com/pollex/ios-sdk
```

Import:

```swift
import Pollex
```

### Android

Add the Pollex SDK to the application module:

```kotlin
implementation("com.pollex:sdk:1.0.0")
```

Import:

```kotlin
import com.pollex.sdk.Pollex
import com.pollex.sdk.PollexConfig
```

### Web

Install the browser SDK:

```bash
npm install pollex-web-sdk
```

Import:

```ts
import { Pollex } from "pollex-web-sdk";
```

## 2. Configure Pollex once

Pollex uses the same workspace API key for telemetry and Liquid bundle resolution.

### iOS

```swift
Pollex.configure(
    PollexConfig(
        apiKey: "YOUR_API_KEY",
        deviceId: "app-scoped-device-id",
        endpoint: URL(string: "https://api.yourdomain.com/events")!,
        appVersion: "1.0.0",
        sessionCaptureEnabled: false
    )
)
```

### Android

```kotlin
Pollex.configure(
    PollexConfig(
        apiKey = "YOUR_API_KEY",
        deviceId = "app-scoped-device-id",
        endpoint = "https://api.yourdomain.com/events",
        appVersion = "1.0.0",
        application = this,
        sessionCaptureEnabled = false
    )
)
```

### Web

Configure Pollex in client-side bootstrap code only:

```ts
import { Pollex } from "pollex-web-sdk";

Pollex.configure({
  apiKey: "YOUR_API_KEY",
  endpoint: "https://api.yourdomain.com/events",
  appVersion: "1.0.0",
  sessionCaptureEnabled: false,
});
```

### Next.js

Use a client component and run configuration once:

```tsx
"use client";

import { useEffect } from "react";
import { Pollex } from "pollex-web-sdk";

export function PollexBootstrap() {
  useEffect(() => {
    Pollex.configure({
      apiKey: process.env.NEXT_PUBLIC_POLLEX_API_KEY ?? "",
      endpoint: process.env.NEXT_PUBLIC_POLLEX_EVENTS_URL ?? "http://127.0.0.1:8000/events",
      appVersion: "1.0.0",
      sessionCaptureEnabled: false,
    });
  }, []);

  return null;
}
```

Notes:

- configure Pollex exactly once
- use HTTPS in production
- the SDK derives both the screenshot upload endpoint and the Liquid runtime endpoint from the Pollex backend host unless explicitly overridden
- browser integrations must run Pollex in client-side code, not in server-only code
- browser API keys are exposed by design, so treat them as publishable ingestion and runtime credentials rather than secrets
- for web local development, the backend must allow the web origin through `CORS_ALLOW_ORIGINS`

## 3. Define stable screen keys and content keys

Use stable identifiers that do not depend on display copy.

Examples:

- screen keys:
  - `welcome`
  - `checkout_paywall`
  - `kyc_form`
- content keys:
  - `checkout_paywall.headline`
  - `checkout_paywall.primary_cta`
  - `kyc_form.email_hint`

The app still owns layout and component structure.
Liquid only replaces content values and safe presentation attributes.

## 4. Track screens and product behavior

### Screen tracking

```swift
Pollex.screen("checkout_paywall")
```

```kotlin
Pollex.screen("checkout_paywall")
```

Recommended placement:

- UIKit: `viewDidAppear(_:)`
- SwiftUI: `.onAppear`
- Android Activity or Fragment: `onResume()`
- Jetpack Compose: `LaunchedEffect(Unit)`
- Web SPA route or screen entry: after route change or page mount
- Next.js client component: inside `useEffect` for the rendered screen

### Interaction tracking

```swift
Pollex.track(
    event: "tap",
    screen: "checkout_paywall",
    elementId: "primary_cta"
)
```

```kotlin
Pollex.track(
    event = "tap",
    screen = "checkout_paywall",
    elementId = "primary_cta"
)
```

```ts
Pollex.track("tap", {
  screen: "checkout_paywall",
  elementId: "primary_cta",
  metadata: {
    variant: "hero_a",
  },
});
```

Track form events only when the app already knows submission or validation state.
Pollex web v1 is explicit-only and does not auto-capture pageviews, clicks, or replay events for you.

## 5. Resolve a Liquid bundle at runtime

The preferred runtime model is one bundle request per screen, not many per-key requests.

### iOS

```swift
Pollex.resolveLiquidBundle(
    screen: "checkout_paywall",
    locale: "en-US",
    subjectId: userId,
    country: "US",
    traits: [
        "user.plan": "growth",
        "user.region": "na"
    ]
) { result in
    switch result {
    case .success(let bundle):
        render(bundle)
    case .failure:
        renderAppFallbackContent()
    }
}
```

### Android

```kotlin
Pollex.resolveLiquidBundle(
    screen = "checkout_paywall",
    locale = "en-US",
    subjectId = userId,
    country = "US",
    traits = mapOf(
        "user.plan" to "growth",
        "user.region" to "na"
    )
) { result ->
    result.onSuccess { bundle ->
        render(bundle)
    }.onFailure {
        renderAppFallbackContent()
    }
}
```

### Web

```ts
const bundle = await Pollex.resolveLiquidBundle({
  screen: "checkout_paywall",
  locale: "en-US",
  subjectId: userId,
  country: "US",
  traits: {
    "user.plan": "growth",
    "user.region": "na",
  },
});

render(bundle);
```

Send these fields when available:

- `screen`
- `locale`
- `subjectId`
- `country`
- stable app or backend traits such as `user.plan`, `user.region`, or `user.cohort`

Do not send sensitive values unless they are already explicitly approved for personalization in your own product and legal review.

## 6. Trait sourcing model

Liquid matches profiles against a merged runtime context.

That context is built from:

1. traits the app sends with the resolve request
2. traits Pollex already stored for the same `subjectId`
3. Pollex-computed behavior traits
4. preview-only overrides inside dashboard preview

Examples of app-provided traits:

- `user.plan`
- `user.region`
- `user.language`
- `account.tier`

Examples of Pollex-computed traits:

- `maze.intent_level`
- `maze.usage_depth`
- `maze.recent_activity`
- `maze.paywall_fatigue`
- `maze.onboarding_stage`

Pollex does not infer sensitive identity traits such as age or gender from behavior.

## 7. Render returned content

Each resolved item can contain:

- `text`
- `icon`
- `visibility`
- `emphasis`
- `ordering`

Example mapping:

- `text` updates button labels, headlines, helper copy, and empty states
- `icon` selects from a fixed app-owned icon registry
- `visibility` toggles existing UI on or off
- `emphasis` maps to existing typography or button treatment levels
- `ordering` controls the order of already-defined content blocks

Do not let Liquid generate arbitrary layouts or component trees.

## 8. Caching and fallback

Runtime behavior should be:

1. request one published Liquid bundle for the current screen
2. cache the result using the SDK helper
3. render a fresh cached bundle immediately when present
4. if the runtime fetch fails and there is no fresh cached bundle, handle the SDK error and fall back in app code
5. use app-local defaults when no usable runtime bundle is available

Current SDK behavior:

- iOS, Android, and web cache fresh bundles using the bundle TTL when provided, otherwise the SDK cache TTL setting
- the SDKs do not currently return an expired cached bundle after a failed fetch
- if you want stale-cache fallback behavior, implement that policy in app code instead of assuming the SDK does it for you

Web runtime notes:

- the browser SDK stores device identity in local storage and session identity in session storage using the configured `storagePrefix`
- the browser SDK flushes queued events on `pagehide` and when the document becomes hidden
- `Pollex.flush()` is useful in tests when you want to force event delivery before asserting backend state

Expected server behavior:

- `Cache-Control: private, max-age=60, stale-while-revalidate=300`
- `ETag` is returned for the resolved bundle
- runtime only serves published state

Preview behavior:

- dashboard preview calls the draft preview endpoint
- preview returns diagnostics for missing traits and fallback reasons
- mobile production runtime must not use draft content

## 9. Draft, staging, and publish workflow

Inside Pollex:

- create or update keys and default copy
- define trait sources and reusable profiles
- attach profile-specific variants
- preview the resolved bundle with diagnostics
- check staging readiness
- publish the key
- publish the bundle

Only published keys and published bundles are served to production runtime.

## 10. Integration status you should expect in Pollex

The Liquid dashboard now reports:

- observed screen count
- runtime resolve count and whether runtime traffic is active
- app trait coverage
- Pollex-computed trait coverage
- fallback-only live keys
- personalized traffic share

If personalization is not happening, check trait coverage before changing copy.

## 11. Session capture compliance

If the host app enables capture at all, it must:

1. show explicit in-app disclosure
2. obtain affirmative user consent
3. keep capture off by default
4. provide a visible in-app indicator while capture is active
5. give the user a way to revoke consent
6. keep sensitive screens blocked

Examples:

```swift
Pollex.setSessionCaptureEnabled(true)
Pollex.setCaptureBlockedScreens([
    "login",
    "signup",
    "otp_verification",
    "password_reset",
    "payment",
    "kyc_id_upload"
])
```

```kotlin
Pollex.setSessionCaptureEnabled(true)
Pollex.setCaptureBlockedScreens(
    setOf("login", "signup", "otp_verification", "password_reset", "payment", "kyc_id_upload")
)
```

Additional SDK helpers:

- `Pollex.setCaptureAllowedScreens(...)` narrows capture to a safe allowlist
- `Pollex.setScreenCaptureEnabled(_:for:)` on iOS and `Pollex.setScreenCaptureEnabled(enabled, screen)` on Android can override one screen at a time
- on web, `captureAllowedScreens`, `captureBlockedScreens`, and `captureEvaluator` are configuration-time controls
- on web, mark elements with `data-pollex-ignore="true"` if they must be excluded from optional screenshot capture

## 12. Data safety rules

Never send raw values for:

- passwords
- OTP codes
- credit card numbers
- national IDs
- bank account numbers
- social security numbers

Rules:

- track field identifiers, not field values
- use stable `elementId` names only
- `deviceId` must come from an app-controlled identifier
- sensitive screens must remain blocked from capture

## 13. Web runtime requirements

Before expecting web telemetry or Liquid runtime to work:

1. the backend must be reachable from the browser origin
2. the browser origin must be included in backend `CORS_ALLOW_ORIGINS`
3. the app must initialize Pollex in client code
4. the app must call `Pollex.screen(...)` explicitly on route entry
5. the app must call `Pollex.track(...)` explicitly for important interactions
6. the app must handle `resolveLiquidBundle(...)` failures with app-local fallback content

Recommended web verification steps:

1. load the target page with browser devtools open
2. confirm `POST /events` appears after `Pollex.screen(...)`
3. confirm `POST /liquid/runtime/bundles/resolve` appears when the app requests content
4. if session capture is enabled, confirm `POST /screenshots` appears only for allowed screens
5. confirm the request sends `X-API-Key`
6. confirm the returned bundle contains the expected `screenKey`, `items`, and `diagnostics`
7. if no events arrive, check CORS, API key, origin, and endpoint reachability first

## 14. Backend endpoints used by the integration

Telemetry:

- `POST /events`
- `POST /screenshots`

Liquid:

- `GET /liquid/overview`
- `POST /liquid/runtime/bundles/resolve`
- `POST /liquid/preview/bundles/resolve`
- `GET /liquid/integration-status`

Admin:

- `GET /liquid/keys`
- `POST /liquid/keys`
- `GET /liquid/keys/{key_id}`
- `PUT /liquid/keys/{key_id}/draft`
- `POST /liquid/keys/{key_id}/publish`
- `POST /liquid/keys/{key_id}/demote`
- `POST /liquid/keys/{key_id}/variants`
- `PUT /liquid/variants/{variant_id}`
- `DELETE /liquid/variants/{variant_id}`
- `GET /liquid/segments`
- `GET /liquid/traits`
- `POST /liquid/traits`
- `GET /liquid/profiles`
- `POST /liquid/profiles`
- `GET /liquid/rules`
- `POST /liquid/rules`
- `GET /liquid/experiments`
- `POST /liquid/experiments`
- `GET /liquid/bundles`
- `POST /liquid/bundles`
- `GET /liquid/bundles/{bundle_id}`
- `PUT /liquid/bundles/{bundle_id}`
- `POST /liquid/bundles/{bundle_id}/publish`

Health:

- `GET /health`
- `GET /ready`
