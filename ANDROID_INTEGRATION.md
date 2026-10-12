# BrandGuard Android companion

The native Android app in `android/` is separate from the website. The existing
dashboard, Threat Analysis, Detection History, Privacy Settings, and Device
Protection surfaces are retained; Android status and privacy-redacted findings
are wired into those existing surfaces. A browser cannot grant Android
notification access: the installed companion uses Android's
`NotificationListenerService`, and the user must enable it in system settings.
The website reports a device as connected only while it receives a fresh,
authenticated heartbeat confirming that notification access is granted and
the listener service is operating.

## What the companion does

- Observes notification callbacks only for WhatsApp
  (`com.whatsapp`) and Telegram (`org.telegram.messenger`).
- Analyzes only text the messaging app exposes in its notification locally.
  Hidden chats, encrypted databases, and text omitted by the source app are not
  available.
- Shows local Android warning notifications for medium- and high-risk results.
- Never writes or sends the original notification text, sender, app identity,
  URL, or message-derived text. The detector creates generic reason codes.
- Sends no summaries or monitoring heartbeat unless the user checks the
  explicit consent box and pairs the device. Opting out stops both. Unpairing
  deletes the device's stored event summaries from the backend.
- Monitoring can be enabled/resumed or paused in the companion. The listener
  checks the pause setting before reading notification extras, so paused mode
  does not collect notification contents. Revoking notification access causes
  the app to pause when next opened, and stale heartbeats make website status
  `NOT_CONNECTED`.

Android notification access is a sensitive system-level permission that may
expose notifications from other apps to the listener process. BrandGuard filters
to the two supported package names before analysis, but this is not a
per-application Android permission. Analysis is heuristic and advisory; it does
not block messages or guarantee that an unflagged message is safe.

## Backend and authentication

The project exposes the Android endpoints both through Vercel serverless
functions under `api/android/` and through the existing Express server in
`server.ts`:

- `POST /api/android/pair`: exchanges an administrator-created one-time code
  for registration of the device's P-256 public key. Codes expire in 10 minutes
  and can be used once.
- `POST /api/android/events`: accepts exactly `eventId`, `riskLevel`, `reasons`,
  and `timestamp`. `reasons` are allow-listed generic codes; unknown fields,
  including original message text, are rejected.
- `POST /api/android/status`: accepts signed monitoring/access booleans and
  refreshes the authenticated companion heartbeat.
- `GET /api/android/status` and `GET /api/android/events`: require the separate
  dashboard access key in `X-BG-Dashboard-Token`. The status endpoint returns
  `CONNECTED`, `PAUSED`, or `NOT_CONNECTED`. A heartbeat older than 75 seconds,
  missing notification access, or a disconnected listener is always reported
  as `NOT_CONNECTED`.
- `DELETE /api/android/device`: unpairs the signed device and deletes its stored
  summaries.

The app generates its ECDSA P-256 private key in Android Keystore; only the
public key is registered. Event and unpair requests are signed with
`SHA256withECDSA`, include a short-lived timestamp and unique nonce, and are
verified by the backend. The backend rejects stale and replayed requests. The
Android client requires HTTPS and does not follow redirects.

Threat summaries are stored in Neon PostgreSQL in
`brandguard_android_threat_events`; paired device public keys and used request
nonces are stored in related tables. Stored event data is limited to device ID,
event ID, `MEDIUM`/`HIGH` risk, generic reason codes, and detection/receipt
timestamps. The website shows Android detections in the existing Dashboard and Detection
History without notification content or sender identity. The dashboard key is
generated alongside the one-time pairing code; only its hash is stored by the
backend. Unpairing deletes the device and its events/nonces.

Pair codes are administrative setup credentials, not user accounts. Anyone
with an unused code can pair a device during its 10-minute lifetime, so create
them only when ready to pair and do not share or commit them.

## Configure the website backend

1. Create a Neon PostgreSQL database and copy its **pooled** connection string.
2. Set `DATABASE_URL` in the Vercel project's Environment Variables for the
   deployment environment. Use the Neon connection string with TLS enabled
   (`sslmode=require`). Do not commit a real database URL.
3. Deploy the project. Vercel will expose the functions from `api/android/`.
   For local development, set `DATABASE_URL` in `.env`; the Express server
   exposes the same routes.
4. Create a one-time pairing code from the project root:

   ```powershell
   $env:DATABASE_URL = "your Neon pooled connection string"
   npm run android:pair-code
   ```

   The command initializes the Android tables if needed and prints a random,
   one-use code and a separate dashboard key. Enter the deployed website's
   HTTPS origin and the one-time code in the Android app. In the existing
   Device Protection page, paste the dashboard key to load the authenticated
   status and detection summaries. Keep both credentials private; the dashboard
   key is retained only for the current browser tab session. This project does
   not have a separate website account system.

## Build and install the APK

Requirements: Android Studio, JDK 17, Android SDK Platform 35 and Build Tools,
and Gradle 8.9 or later compatible with Android Gradle Plugin 8.7.3.

1. Open the repository's `android/` folder in Android Studio and sync Gradle.
2. Select the `app` configuration and build the `debug` APK, or from the
   repository root run:

   ```powershell
   cd android
   gradle :app:assembleDebug
   ```

3. The APK is written to
   `android/app/build/outputs/apk/debug/app-debug.apk`. Install it on a test
   phone with Android 8.0 (API 26) or later from the `android/` folder:

   ```powershell
   adb install -r app\build\outputs\apk\debug\app-debug.apk
   ```

4. Open BrandGuard. Use **Open Notification Access Settings** and explicitly
    grant notification access. Separately allow warning notifications (required
    on Android 13+).
5. In the app, enter the deployed HTTPS website origin and a fresh pairing
    code. Check the explicit threat-summary and status-sharing consent box and
    pair. Use **Enable / resume notification monitoring** to start, **Pause
    notification monitoring** to stop collection immediately, and **Unpair and
    delete synced summaries** to disconnect and delete backend data.
6. In the website's Device Protection page, enter the dashboard key printed by
    the pairing-code command. The page refreshes status and Android detections
    automatically while open.
7. Send a harmless test message through WhatsApp or Telegram containing common
   scam wording and a reserved, non-routable test domain such as
   `example.invalid`. Confirm the phone warning appears and the backend accepts
   only the risk code, reason codes, and timestamp. Confirm the website displays
   the redacted detection in Dashboard and Detection History. Also test a normal
   message, paused mode, disabled sharing, revoked notification access, and the
   test-warning button. Status must become `PAUSED` on pause and
   `NOT_CONNECTED` after access revocation or heartbeat timeout.
8. Keep protection described as verified only after these tests pass on the
   target device. The heuristic detector is advisory and does not block messages.

Set Android's automatic date/time: signed requests are rejected if the device
clock differs from the backend by more than five minutes. The project does not
include a Gradle wrapper; Android Studio can sync the project, or install a
compatible Gradle distribution to use the command-line build.
