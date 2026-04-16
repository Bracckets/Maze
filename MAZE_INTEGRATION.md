# MAZE_INTEGRATION

Follow this document when integrating Maze into a mobile app.

Maze now covers two connected responsibilities:

1. Behavior telemetry and optional session capture
2. Liquid runtime bundle resolution for app content

The goal is one coherent Maze setup, not two separate SDK stories.

## Core integration contract

At runtime the app should:

1. configure Maze once at launch
2. continue sending telemetry with `Maze.screen(...)` and `Maze.track(...)`
3. identify a screen using a stable `screenKey`
4. resolve one Liquid bundle for that screen
5. pass stable app or account traits when available
6. render the returned content or fall back to local defaults

Developers should only need to do four app-specific things:

- define stable screen identifiers
- define stable content keys in UI code
- pass stable identity or account traits that the app already knows
- map returned Liquid content to existing UI labels and safe attributes

Maze computes behavior traits on the server. The app should not try to recreate those client-side.

## Compliance first

Maze session capture remains optional.

Default rules:

- telemetry is allowed after the host app configures Maze
- screen capture is off by default
- screen capture may only be enabled after explicit user consent and visible in-app disclosure

Never enable capture by default on:

- login
- signup
- otp_verification
- password_reset
- payment
- kyc_id_upload

## 1. Install the Maze SDK

### iOS

Use Swift Package Manager:

```text
https://github.com/maze/ios-sdk
```

Import:

```swift
import Maze
```

### Android

Add the Maze SDK to the application module:

```kotlin
implementation("com.maze:sdk:1.0.0")
```

Import:

```kotlin
import com.maze.sdk.Maze
import com.maze.sdk.MazeConfig
```

## 2. Configure Maze once

Maze uses the same workspace API key for telemetry and Liquid bundle resolution.

### iOS

```swift
Maze.configure(
    MazeConfig(
        apiKey: "YOUR_API_KEY",
        deviceId: "app-scoped-device-id",
        endpoint: URL(string: "https://api.yourdomain.com/events")!,
        sessionCaptureEnabled: false
    )
)
```

### Android

```kotlin
Maze.configure(
    MazeConfig(
        apiKey = "YOUR_API_KEY",
        deviceId = "app-scoped-device-id",
        endpoint = "https://api.yourdomain.com/events",
        application = this,
        sessionCaptureEnabled = false
    )
)
```

Notes:

- configure Maze exactly once
- use HTTPS in production
- the SDK derives the Liquid runtime endpoint from the Maze backend host unless explicitly overridden

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
Maze.screen("checkout_paywall")
```

```kotlin
Maze.screen("checkout_paywall")
```

Recommended placement:

- UIKit: `viewDidAppear(_:)`
- SwiftUI: `.onAppear`
- Android Activity or Fragment: `onResume()`
- Jetpack Compose: `LaunchedEffect(Unit)`

### Interaction tracking

```swift
Maze.track(
    event: "tap",
    screen: "checkout_paywall",
    elementId: "primary_cta"
)
```

```kotlin
Maze.track(
    event = "tap",
    screen = "checkout_paywall",
    elementId = "primary_cta"
)
```

Track form events only when the app already knows submission or validation state.

## 5. Resolve a Liquid bundle at runtime

The preferred runtime model is one bundle request per screen, not many per-key requests.

### iOS

```swift
Maze.resolveLiquidBundle(
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
        renderLastKnownBundleOrLocalDefaults()
    }
}
```

### Android

```kotlin
Maze.resolveLiquidBundle(
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
        renderLastKnownBundleOrLocalDefaults()
    }
}
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
2. traits Maze already stored for the same `subjectId`
3. Maze-computed behavior traits
4. preview-only overrides inside dashboard preview

Examples of app-provided traits:

- `user.plan`
- `user.region`
- `user.language`
- `account.tier`

Examples of Maze-computed traits:

- `maze.intent_level`
- `maze.usage_depth`
- `maze.recent_activity`
- `maze.paywall_fatigue`
- `maze.onboarding_stage`

Maze does not infer sensitive identity traits such as age or gender from behavior.

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
3. render the bundle immediately when present
4. on failure, use the last known cached bundle
5. if no cached bundle exists, use app-local defaults

Expected server behavior:

- `Cache-Control: private, max-age=60, stale-while-revalidate=300`
- `ETag` is returned for the resolved bundle
- runtime only serves published state

Preview behavior:

- dashboard preview calls the draft preview endpoint
- preview returns diagnostics for missing traits and fallback reasons
- mobile production runtime must not use draft content

## 9. Draft, staging, and publish workflow

Inside Maze:

- create or update keys and default copy
- define trait sources and reusable profiles
- attach profile-specific variants
- preview the resolved bundle with diagnostics
- check staging readiness
- publish the key
- publish the bundle

Only published keys and published bundles are served to production runtime.

## 10. Integration status you should expect in Maze

The Liquid dashboard now reports:

- whether observed screens exist
- whether runtime bundle resolves are happening
- app trait coverage
- Maze-computed trait coverage
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
Maze.setSessionCaptureEnabled(true)
Maze.setCaptureBlockedScreens(["login", "signup", "otp_verification", "payment"])
```

```kotlin
Maze.setSessionCaptureEnabled(true)
Maze.setCaptureBlockedScreens(setOf("login", "signup", "otp_verification", "payment"))
```

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

## 13. Backend endpoints used by the integration

Telemetry:

- `POST /events`

Liquid:

- `POST /liquid/runtime/bundles/resolve`
- `POST /liquid/preview/bundles/resolve`
- `GET /liquid/integration-status`

Admin:

- `GET /liquid/keys`
- `GET /liquid/traits`
- `GET /liquid/profiles`
- `GET /liquid/variants`
- `GET /liquid/bundles`

Health:

- `GET /health`
- `GET /ready`
