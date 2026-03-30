# MAZE_INTEGRATION

Follow this document exactly. Make code changes directly in the app codebase until the Maze SDK is installed, initialized, and emitting onboarding analytics events.

## 1. SDK Installation

### iOS (Swift)

1. Detect whether the iOS app uses Swift Package Manager.
2. Check for a `Package.swift` file, `project.pbxproj` package references, or Xcode package resolution files.
3. If Swift Package Manager is already in use, add the Maze iOS SDK dependency:
   `[https://github.com/maze/ios-sdk](https://github.com/maze/ios-sdk)`
4. If Swift Package Manager is not detected:
   Add Swift Package Manager support instead of using CocoaPods or Carthage.
5. Add the package to the main app target, not only to tests or extensions.
6. Ensure the Maze module is importable from the application target.

### Android (Kotlin)

1. Locate the app module build file.
   Common paths:
   `app/build.gradle`
   `app/build.gradle.kts`
2. Add the Maze dependency to the app module:

```gradle
implementation "com.maze:sdk:1.0.0"
```

3. If the project uses Kotlin DSL, convert it to:

```kotlin
implementation("com.maze:sdk:1.0.0")
```

4. Sync Gradle after editing the dependency file.
5. Do not add the SDK only to a library module unless that library is the actual application entry path.

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
Maze.initialize(apiKey: "YOUR_API_KEY")
```

4. Use these placement rules:
   In `AppDelegate.swift`, place it inside `application(_:didFinishLaunchingWithOptions:)`.
   In `SceneDelegate.swift`, place it at the start of `scene(_:willConnectTo:options:)` only if no earlier app-wide hook exists.
   In a SwiftUI `App` struct, place it in `init()`.
5. If multiple launch hooks exist, initialize Maze only once in the earliest shared app entry point.
6. If `import Maze` already exists, do not add a duplicate import.

### Android

1. Locate the earliest application launch entry point.
2. Prefer these classes in order:
   `Application` subclass
   `MainActivity`
   launcher `Activity`
3. Insert Maze initialization so it runs exactly once at startup:

```kotlin
Maze.initialize(context, "YOUR_API_KEY")
```

4. Use these placement rules:
   In an `Application` subclass, call it inside `onCreate()`.
   In an `Activity`, call it inside `onCreate()` before onboarding navigation begins.
5. If no `Application` subclass exists and the manifest points directly to an activity, initialize in the launcher activity.
6. If you create a new `Application` subclass, register it in `AndroidManifest.xml`.
7. Add the correct import for the Maze SDK package used by the dependency.

## 3. Screen Tracking

1. Identify onboarding-related screens by reading routes, feature folders, screen/view controller names, navigation graphs, and text labels.
2. Prioritize these screens:
   `welcome`
   `login`
   `signup`
   `otp_verification`
   `kyc_form`
3. Instrument at least 3 onboarding screens.
4. Add one screen event when each screen becomes visible.

### iOS screen tracking rules

1. In UIKit view controllers, call:

```swift
Maze.screen("screen_name")
```

2. Place the call in `viewDidAppear(_:)` unless the codebase uses a different existing analytics hook.
3. If an existing analytics wrapper exists, integrate Maze beside it instead of replacing it.
4. In SwiftUI views, place the call in `.onAppear`.

### Android screen tracking rules

1. In activities or fragments, call:

```kotlin
Maze.screen("screen_name")
```

2. Place the call in `onResume()` unless the project already tracks screens in a shared base class.
3. In Jetpack Compose, place the call in a `LaunchedEffect(Unit)` or the project’s existing analytics effect pattern.

### Screen naming rules

1. Use lowercase snake_case.
2. Prefer explicit names:
   `welcome`
   `login`
   `signup`
   `otp_verification`
   `kyc_form`
3. If the real screen name is unclear, infer from the class name, route name, feature folder, or visible header text.
4. If there are multiple KYC-like steps, use distinct names such as:
   `kyc_personal_info`
   `kyc_address`
   `kyc_review`

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
4. Use this payload pattern:

```swift
Maze.track(
    event: "tap",
    screen: "CURRENT_SCREEN",
    elementId: "continue_button",
    x: tapX,
    y: tapY
)
```

```kotlin
Maze.track(
    event = "tap",
    screen = "CURRENT_SCREEN",
    elementId = "continue_button",
    x = tapX,
    y = tapY
)
```

5. When native tap coordinates are available from the event handler, pass them.
6. Maze SDK normalizes coordinates before sending them to the backend.
7. If coordinates are unavailable in a specific handler, still send the event without them.

### elementId rules

1. Use lowercase snake_case only.
2. Make the ID descriptive and stable.
3. Append `_button` for buttons.
4. Good examples:
   `continue_button`
   `verify_button`
   `submit_button`
   `next_button`
   `create_account_button`
5. Do not use raw UI text with spaces.
6. Do not use autogenerated view IDs unless no descriptive name exists.

### Placement rules

1. UIKit:
   Insert tracking at the top of the selector or closure handling the tap.
2. SwiftUI:
   Insert tracking at the start of the `Button` action closure.
3. Android Views:
   Insert tracking at the start of the `setOnClickListener` body or click handler method.
4. Jetpack Compose:
   Insert tracking at the start of the `onClick` lambda.
5. Instrument at least 2 CTA tap events.

### Coordinate rules

1. Prefer the actual touch or click position from the native event object.
2. Pass screen-relative coordinates when possible.
3. Do not block the integration if a handler does not expose coordinates.
4. Do not fabricate coordinates from unrelated layout state.

## 5. Form Interactions

1. On input-heavy onboarding screens such as KYC, login, signup, or OTP verification, add form interaction tracking.
2. Track a submission event when the form is submitted:

```swift
Maze.track(
    event: "form_submit",
    screen: "kyc_form"
)
```

```kotlin
Maze.track(
    event = "form_submit",
    screen = "kyc_form"
)
```

3. Track a validation failure event when form validation fails or an error message is shown:

```swift
Maze.track(
    event: "error_message",
    screen: "kyc_form",
    elementId: "email_field"
)
```

```kotlin
Maze.track(
    event = "error_message",
    screen = "kyc_form",
    elementId = "email_field"
)
```

4. Use field-based `elementId` values in snake_case:
   `phone_field`
   `otp_field`
   `address_field`
   `email_field`
5. Add these calls only where the app already knows validation failed. Do not invent error states.

## 6. Data Safety Rules

1. Never send raw secrets or regulated personal data to Maze.
2. Do not log or track values for:
   passwords
   credit card numbers
   national IDs
   social security numbers
   bank account numbers
   OTP codes
3. If an existing analytics helper accepts metadata dictionaries or bundles, inspect the payload before reusing it.
4. If a field appears sensitive, either:
   mask the value
   omit the field
   skip the event if safe masking is not possible
5. Track field identifiers, not field contents.
6. If an event currently includes full form text, edit it to remove sensitive values before adding Maze.

## 7. Verification

Complete all checks before finishing.

1. Confirm `Maze.initialize(...)` is called exactly once.
2. Confirm at least 3 screens call `Maze.screen(...)`.
3. Confirm at least 2 CTA handlers call `Maze.track(... event: "tap" ...)` or the Kotlin equivalent.
4. Confirm at least 1 form interaction event exists on an input-heavy onboarding screen.
5. Confirm at least 1 primary CTA tap includes coordinate data when the platform event handler exposes the tap position.
6. Build the app or run the project’s existing compile check.
7. Fix compile errors caused by imports, lifecycle placement, or type mismatches.
8. If the project has unit or UI tests covering onboarding, run the smallest relevant test set after changes.

## 8. Optional Test

If local execution is possible, run a lightweight functional check.

1. Launch the app.
2. Navigate through the onboarding flow.
3. Trigger at least 2 tracked button taps.
4. Submit at least 1 form.
5. Confirm at least 1 tap event includes coordinate fields in the network payload or debug output.
6. Confirm events are being sent using one of these signals:
   Maze debug logs
   existing network inspector
   HTTP proxy output
   app console output
7. If runtime verification is not possible in the environment, still complete compile verification and document that runtime send verification could not be executed.

## 9. Fallback Logic

Apply the following fallback behavior when the codebase structure differs from expectations.

### If no onboarding flow is obvious

1. Identify the first 3 main user-facing screens reachable from app launch.
2. Instrument those 3 screens with `Maze.screen(...)`.
3. Instrument their primary CTA buttons with `Maze.track(... event: "tap" ...)`.

### If no clear buttons are named

1. Track the main interactive control on each selected screen.
2. Use generic but valid IDs:
   `primary_button`
   `secondary_button`
   `submit_button`

### If the app uses wrappers around analytics

1. Search for existing analytics abstractions such as:
   `Analytics`
   `Tracker`
   `Telemetry`
   `EventLogger`
2. Prefer adding Maze calls inside the shared wrapper only if that wrapper already receives screen names and CTA identifiers cleanly.
3. If the wrapper is too generic or lacks enough context, instrument the concrete onboarding screen files directly.

### If the app uses navigation routes instead of screen classes

1. Use the route name as the Maze screen name after converting it to lowercase snake_case.

### If there is no Application class on Android

1. Initialize Maze in the launcher activity.
2. If you create an `Application` class, register it in `AndroidManifest.xml` and ensure no duplicate initialization remains in activities.

### If iOS uses SwiftUI only

1. Initialize Maze in the `@main` app struct `init()`.
2. Track screens in `.onAppear`.
3. Track taps inside `Button` action closures.

## 10. Execution Checklist

Perform this sequence in order.

1. Detect iOS and Android build systems.
2. Add the Maze SDK dependency on each present platform.
3. Add Maze initialization in the earliest app startup hook.
4. Identify onboarding screens.
5. Add `Maze.screen(...)` to at least 3 screens.
6. Add `Maze.track(... event: "tap" ...)` to at least 2 CTA handlers.
7. Pass tap coordinates where native handlers expose them.
8. Add `form_submit` and `error_message` tracking on at least 1 form-heavy screen.
9. Remove or mask sensitive values from any analytics payloads connected to Maze calls.
10. Build or compile the app.
11. Verify the instrumentation counts meet the minimum requirements.

## Success Criteria

The integration is successful only when all of the following are true:

1. The Maze SDK dependency is installed for each mobile platform present in the repo.
2. `Maze.initialize(...)` is present and executed once at app launch.
3. At least 3 screens are instrumented with `Maze.screen(...)`.
4. At least 2 CTA interactions are instrumented with `Maze.track(... event: "tap" ...)`.
5. At least 1 CTA tap includes coordinate data when the platform event handler exposes a tap position.
6. At least 1 form-heavy onboarding screen tracks `form_submit` and validation failure or error display.
7. Sensitive values are not sent to Maze.
8. The app compiles without new errors.
9. Event sending is verified by runtime logs or, if runtime execution is unavailable, by successful build plus documented instrumentation points.
