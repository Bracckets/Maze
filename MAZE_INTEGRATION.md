# MAZE_INTEGRATION

Follow this document exactly. Make code changes directly in the app codebase until the Maze SDK is installed, initialized, and emitting onboarding analytics events in a store-compliant way.

## Compliance First

Maze supports two separate capabilities:

1. Events and heatmap analytics
2. Optional screen capture for screenshot-backed heatmaps

Default rule:

- Events are allowed by default after the host app configures Maze.
- Screen capture must remain off by default.
- Screen capture may only be enabled after the host app obtains explicit user consent and provides a visible in-app indication while capture is active.

Never enable screen capture by default on login, signup, OTP, payment, password reset, or identity-document screens.

## 1. SDK Installation

### iOS (Swift)

1. Detect whether the iOS app uses Swift Package Manager.
2. Check for `Package.swift`, `project.pbxproj` package references, or Xcode package resolution files.
3. If Swift Package Manager is already in use, add the Maze iOS SDK dependency:
   `[https://github.com/maze/ios-sdk](https://github.com/maze/ios-sdk)`
4. If Swift Package Manager is not detected:
   add Swift Package Manager support instead of using CocoaPods or Carthage.
5. Add the package to the main app target, not only to tests or extensions.
6. Import `Maze` in the application target.

Compatibility note:

- Older integrations may still import `UXTracker`, but all new integrations must use `Maze`.

### Android (Kotlin)

1. Locate the app module build file.
   Common paths:
   `app/build.gradle`
   `app/build.gradle.kts`
2. Add the Maze dependency to the app module:

```gradle
implementation "com.maze:sdk:1.0.0"
```

3. If the project uses Kotlin DSL, use:

```kotlin
implementation("com.maze:sdk:1.0.0")
```

4. Sync Gradle after editing the dependency file.
5. Import `com.maze.sdk.Maze` for new integrations.

Compatibility note:

- Older code may still reference `com.maze.uxtracker.UXTracker`, but all new code should use `com.maze.sdk.Maze`.

## 2. Initialization

### iOS

1. Locate the earliest application launch entry point.
2. Prefer these files in order:
   `AppDelegate.swift`
   `SceneDelegate.swift`
   SwiftUI app entry file containing `@main`
3. Insert Maze initialization so it runs exactly once during app startup:

```swift
import Maze

Maze.configure(
    MazeConfig(
        apiKey: "YOUR_API_KEY",
        deviceId: "app-scoped-device-id",
        endpoint: URL(string: "https://api.yourdomain.com/events")!,
        sessionCaptureEnabled: false
    )
)
```

4. If the host app has a separate consent flow for capture, enable it only after consent:

```swift
Maze.setSessionCaptureEnabled(true)
```

5. If the host app needs extra protection, block sensitive screens explicitly:

```swift
Maze.setCaptureBlockedScreens([
    "login",
    "signup",
    "otp_verification",
    "payment"
])
```

6. Use these placement rules:
   place configuration in the earliest shared startup hook.
7. If multiple launch hooks exist, initialize Maze only once.

### Android

1. Locate the earliest application launch entry point.
2. Prefer these classes in order:
   `Application` subclass
   `MainActivity`
   launcher `Activity`
3. Insert Maze initialization so it runs exactly once at startup:

```kotlin
import com.maze.sdk.Maze
import com.maze.sdk.MazeConfig

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

4. Enable capture only after explicit user consent:

```kotlin
Maze.setSessionCaptureEnabled(true)
```

5. Block sensitive screens explicitly when needed:

```kotlin
Maze.setCaptureBlockedScreens(
    setOf("login", "signup", "otp_verification", "payment")
)
```

6. If no `Application` subclass exists and the manifest points directly to an activity, initialize in the launcher activity.
7. If you create a new `Application` subclass, register it in `AndroidManifest.xml`.

## 3. Screen Tracking

1. Identify onboarding-related screens by reading routes, feature folders, screen/view controller names, navigation graphs, and visible text.
2. Prioritize these screens:
   `welcome`
   `login`
   `signup`
   `otp_verification`
   `kyc_form`
3. Instrument at least 3 onboarding screens.
4. Add one screen event when each screen becomes visible.

### iOS screen tracking

```swift
Maze.screen("screen_name")
```

- UIKit: place in `viewDidAppear(_:)` unless the codebase uses a shared analytics hook.
- SwiftUI: place in `.onAppear`.

### Android screen tracking

```kotlin
Maze.screen("screen_name")
```

- Activities or Fragments: place in `onResume()` unless a shared analytics base class already exists.
- Jetpack Compose: place in `LaunchedEffect(Unit)` or the project's existing analytics pattern.

### Screen naming

- Use lowercase snake_case only.
- Prefer explicit names:
  `welcome`
  `login`
  `signup`
  `otp_verification`
  `kyc_form`

## 4. Tap Tracking

1. Identify primary CTA buttons on onboarding screens.
2. Prioritize buttons whose text or semantic role maps to:
   `Continue`
   `Next`
   `Submit`
   `Verify`
   `Get Started`
   `Create Account`
3. Add Maze tracking immediately before the action handler logic, navigation call, or submit request.

### iOS

```swift
Maze.track(
    event: "tap",
    screen: "CURRENT_SCREEN",
    elementId: "continue_button",
    x: tapX,
    y: tapY
)
```

### Android

```kotlin
Maze.track(
    event = "tap",
    screen = "CURRENT_SCREEN",
    elementId = "continue_button",
    x = tapX,
    y = tapY
)
```

Rules:

- Pass real click/tap coordinates when available.
- Maze normalizes coordinates before sending them.
- If coordinates are unavailable, still send the event without them.
- Use stable snake_case `elementId` values only.

## 5. Form Interactions

Track form-level events only where the app already knows validation or submission state.

### iOS

```swift
Maze.track(
    event: "form_submit",
    screen: "kyc_form"
)
```

```swift
Maze.track(
    event: "error_message",
    screen: "kyc_form",
    elementId: "email_field"
)
```

### Android

```kotlin
Maze.track(
    event = "form_submit",
    screen = "kyc_form"
)
```

```kotlin
Maze.track(
    event = "error_message",
    screen = "kyc_form",
    elementId = "email_field"
)
```

## 6. Data Safety Rules

1. Never send raw secrets or regulated personal data to Maze.
2. Do not log or track values for:
   passwords
   credit card numbers
   national IDs
   social security numbers
   bank account numbers
   OTP codes
3. Track field identifiers, not field contents.
4. Maze metadata masking is partial protection only. It does not make sensitive payloads safe to send.
5. If a field appears sensitive, either:
   mask the value before calling Maze
   omit the field
   skip the event if safe masking is not possible
6. `deviceId` must come from an app-controlled identifier, not prohibited fingerprinting techniques.
7. Use HTTPS endpoints in production.

## 7. Capture Compliance Requirements

The integrator must do all of the following before enabling screen capture:

1. Show explicit in-app disclosure describing that screenshots or session capture will be collected.
2. Obtain affirmative user consent before calling `Maze.setSessionCaptureEnabled(true)`.
3. Provide a visible in-app indication while capture is active.
4. Provide a user-facing way to revoke consent and stop future capture.
5. Exclude sensitive screens by default.
6. Reflect the data collection accurately in App Store privacy disclosures and Google Play Data Safety.

## 8. Verification

Complete all checks before finishing:

1. Confirm `Maze.configure(...)` is called exactly once.
2. Confirm at least 3 screens call `Maze.screen(...)`.
3. Confirm at least 2 CTA handlers call `Maze.track(... event: "tap" ...)`.
4. Confirm at least 1 form interaction event exists on an input-heavy onboarding screen.
5. Confirm screen capture is disabled by default.
6. Confirm capture can only be enabled through an explicit app-side consent path.
7. Confirm sensitive screens are blocked from capture.
8. Build the app or run the smallest relevant compile check.

## 9. Success Criteria

The integration is successful only when all of the following are true:

1. The Maze SDK dependency is installed for each mobile platform present in the repo.
2. `Maze.configure(...)` is present and executed once at app launch.
3. At least 3 screens are instrumented with `Maze.screen(...)`.
4. At least 2 CTA interactions are instrumented with `Maze.track(... event: "tap" ...)`.
5. At least 1 form-heavy onboarding screen tracks `form_submit` and validation failure or error display.
6. Screen capture is off by default.
7. Screen capture is enabled only after explicit user consent.
8. Sensitive values are not sent to Maze.
9. The app compiles without new errors.
