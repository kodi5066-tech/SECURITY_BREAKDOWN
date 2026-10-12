# BrandGuard Android integration

The Android companion is a separate native project under `android/`. It does not
change or embed source code in the website. The current website has no Android
device connection protocol, and this integration does not report a device as
connected to it.

## Permission and data flow

1. Install and open the Android app on the device.
2. The app directs the user to Android's Notification Access settings. The user
   must find BrandGuard and explicitly enable access there; Android does not
   allow an app to grant this special access silently.
3. The app requests Android 13+ notification-posting permission separately.
   Without that permission, Android may prevent BrandGuard warning notifications
   from appearing.
4. `NotificationListenerService` receives notifications posted after access is
   enabled. BrandGuard accepts only the supported package names in
   `BrandGuardNotificationListener.kt` and analyzes text made available by
   Android's messaging-style, expanded, or ordinary notification fields. It
   cannot read hidden messages, encrypted app databases, or notification text
   the messaging app does not expose.
5. `RiskDetectionEngine.kt` evaluates the available text locally. Medium- and
   high-risk results are passed to `BrandGuardAlertManager.kt`, which posts a
   warning without including the original message or sender in the alert.
6. The service ignores BrandGuard's own notifications. It does not persist
   notification text or send it to a server.

Notification access is broad Android access to notification content, not
per-app scoped permission. The allow-list limits what this implementation
analyzes, but the user should grant access only if they trust the installed
application. Android notification contents may be incomplete and heuristic
analysis can produce false positives or miss threats; the warning is advisory
and does not block a message or link.

## Build and test

Requirements: Android Studio, JDK 17, Android SDK Platform 35, Android Build
Tools installed by SDK Manager, and Gradle 8.9 or newer compatible with Android
Gradle plugin 8.7.3. Open the `android/` directory in Android Studio and sync,
or from that directory run `gradle :app:assembleDebug`. Install the resulting
`app/build/outputs/apk/debug/app-debug.apk` on a test device running Android
8.0 (API 26) or newer.

On the device:

1. Open BrandGuard and use **Open Notification Access Settings**. Enable
   BrandGuard in the Android system screen and return to the app.
2. Grant **Allow notifications** when prompted (Android 13+).
3. Use **Send test warning** to verify that Android can show BrandGuard alerts.
4. From another device or test account, send a benign test message containing
   an obviously suspicious phrase and a reserved test domain such as
   `example.invalid` through a supported messaging app. Do not use a real
   phishing site or real credentials.
5. Verify a warning is posted and that ordinary messages do not trigger a
   warning. Repeat after revoking each permission and confirm the app reports
   the permission as missing and no longer claims setup is complete.
6. Review device logs only for listener lifecycle events; message text is
   intentionally not logged.

Until an APK has been built, installed, permissions granted, and these checks
passed on a real Android device, Android protection is **not verified**. The
website remains a browser demo and must not display an Android-connected or
protected status.

## Website analysis API compatibility

The native detector returns the same core result fields used by the website's
`ThreatAnalysis` type: `riskLevel` (`LOW`, `MEDIUM`, or `HIGH`), `category`,
`indicators`, `whySuspicious`, `recommendedAction`, `warningAlertText`, and
`onDeviceProcessed`. It uses a separate Kotlin data class and does not import
website code.

The existing optional web endpoint is `POST /api/analyze`. Its request fields
are `sender`, `message`, `packageName`, and `useCloudAi`; its response uses the
same camelCase analysis fields. The Android project intentionally performs
local analysis only and does not call this endpoint or transmit notification
text. A future server integration must be a separately reviewed opt-in, use
HTTPS outside local development, define authentication and retention behavior,
and not mark the website's device status connected without an authenticated,
tested pairing protocol.

## Android files

- `android/settings.gradle.kts` and `android/build.gradle.kts`: Gradle plugin
  repositories and Android/Kotlin plugin versions.
- `android/gradle.properties`: AndroidX and Gradle process configuration.
- `android/app/build.gradle.kts`: application ID, SDK range, and Java/Kotlin
  target.
- `android/app/src/main/AndroidManifest.xml`: launcher activity, notification
  listener service declaration, and notification/vibration permissions.
- `android/app/src/main/java/com/brandguard/drp/MainActivity.kt`: permission
  onboarding, live permission status, and test-warning action.
- `android/app/src/main/java/com/brandguard/drp/service/BrandGuardNotificationListener.kt`:
  supported-app filter and notification-text extraction.
- `android/app/src/main/java/com/brandguard/drp/engine/RiskDetectionEngine.kt`:
  local risk analysis and website-compatible result fields.
- `android/app/src/main/java/com/brandguard/drp/notifications/BrandGuardAlertManager.kt`:
  Android notification channel and privacy-preserving warning display.
