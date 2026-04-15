# MAZE_INTEGRATION

Follow this document exactly when integrating Maze into a mobile app.

Maze now covers two connected responsibilities:

1. Behavior telemetry and optional session capture
2. Liquid runtime bundle resolution for app content

The integration goal is one coherent Maze setup, not separate SDK stories.

## Core integration contract

At runtime the app should:

1. configure Maze once at launch
2. continue sending telemetry with `Maze.screen(...)` and `Maze.track(...)`
3. identify a screen using a stable `screenKey`
4. resolve one Liquid bundle for that screen
5. cache the resolved bundle locally
6. render text plus safe attributes returned by Liquid

Developers should only need to do three app-specific things:

- define stable screen identifiers
- define stable content keys in UI code
- map returned Liquid content to existing UI labels and simple attributes

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

Use Swift Package Manager.

Add the Maze package to the main app target:

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

Maze uses the same workspace API key for telemetry and Liquid runtime bundle resolution.

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

In app code, use stable identifiers that do not depend on copy text.

Examples:

- screen keys:
  - `welcome`
  - `checkout_paywall`
  - `kyc_form`
- content keys:
  - `checkout_paywall.headline`
  - `checkout_paywall.primary_cta`
  - `kyc_form.email_hint`

The app should still own layout and component structure.
Liquid only replaces content values and safe presentation attributes.

## 4. Track screens and product behavior

### Screen tracking

```swift
Maze.screen("checkout_paywall")
```

```kotlin
Maze.screen("checkout_paywall")
```

Placement:

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
    traits: ["plan": "growth"]
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
    traits = mapOf("plan" to "growth")
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
- stable traits such as `plan`, `cohort`, or `region`

## 6. Render returned content

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

## 7. Caching and fallback

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
- mobile production runtime must not use draft content

## 8. Draft and publish workflow

Inside Maze:

- edit keys and variants in draft
- edit bundle mappings in draft
- preview the bundle in the Maze dashboard
- publish the key
- publish the bundle

Only published keys and published bundles are served to production runtime.

## 9. Session capture compliance

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

## 10. Data safety rules

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

## 11. Backend endpoints used by the integration

Telemetry:

- `POST /events`
- `POST /screenshots`

Liquid:

- `POST /liquid/runtime/bundles/resolve`

Dashboard and preview:

- `GET /liquid/keys`
- `GET /liquid/bundles`
- `GET /liquid/segments`
- `GET /liquid/rules`
- `GET /liquid/experiments`
- `POST /liquid/preview/bundles/resolve`

## 12. Verification checklist

Before finishing, confirm all of the following:

1. `Maze.configure(...)` is called exactly once.
2. At least 3 important screens call `Maze.screen(...)`.
3. At least 2 CTA handlers call `Maze.track(... event: "tap" ...)`.
4. At least 1 form-heavy screen tracks submission or validation behavior.
5. Screen capture is disabled by default.
6. Capture can only be enabled through explicit app-side consent.
7. Sensitive screens are blocked from capture.
8. The app resolves at least 1 Liquid bundle for a real screen.
9. The app renders Liquid `text` and safe attributes from the bundle response.
10. The app falls back to cached or local defaults if bundle resolution fails.

## 13. Success criteria

The integration is successful only when:

- Maze telemetry is active
- the Liquid runtime bundle path is active
- the app uses stable screen keys and content keys
- bundle resolution happens through the Maze SDK path
- the app caches bundle responses locally
- the app renders published content only in production
- session capture remains compliant
