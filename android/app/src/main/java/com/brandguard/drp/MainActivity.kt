package com.brandguard.drp

import android.Manifest
import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.provider.Settings.Secure
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.brandguard.drp.network.BrandGuardBackendClient
import com.brandguard.drp.notifications.BrandGuardAlertManager
import com.brandguard.drp.security.DeviceKeyStore
import java.text.DateFormat
import java.util.Date
import java.util.UUID
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private val background = Executors.newSingleThreadExecutor()
    private val preferences by lazy { getSharedPreferences(PREFERENCES_NAME, MODE_PRIVATE) }

    private lateinit var statusView: TextView
    private lateinit var backendUrlInput: EditText
    private lateinit var pairingCodeInput: EditText
    private lateinit var shareSummariesCheckBox: CheckBox
    private lateinit var enableMonitoringButton: Button
    private lateinit var pauseMonitoringButton: Button
    private lateinit var pairButton: Button
    private lateinit var unpairButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 40, 32, 32)
        }
        setContentView(ScrollView(this).apply { addView(content) })

        content.addView(TextView(this).apply {
            text = "BrandGuard DRP"
            textSize = 26f
            setTextColor(0xFF102A43.toInt())
        })
        content.addView(TextView(this).apply {
            text = "Android notification analysis"
            textSize = 16f
            setPadding(0, 8, 0, 24)
        })

        statusView = TextView(this).apply {
            textSize = 15f
            setPadding(16, 16, 16, 16)
            setBackgroundColor(0xFFEAF2F8.toInt())
        }
        content.addView(statusView, matchWidth())

        content.addView(TextView(this).apply {
            text = "BrandGuard analyzes only text exposed in WhatsApp and Telegram notifications. "
                .plus("Android notification access is sensitive; grant it only if you trust this app. ")
                .plus("Local analysis does not upload or save the original notification text.")
            textSize = 14f
            setPadding(0, 20, 0, 12)
        })

        content.addView(actionButton("Open Notification Access Settings") {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        })
        enableMonitoringButton = actionButton("Enable / resume notification monitoring") {
            setMonitoringEnabled(true)
        }
        content.addView(enableMonitoringButton)
        pauseMonitoringButton = actionButton("Pause notification monitoring") {
            setMonitoringEnabled(false)
        }
        content.addView(pauseMonitoringButton)
        content.addView(actionButton("Allow BrandGuard warning notifications") {
            requestWarningPermission()
        })
        content.addView(actionButton("Send test warning") {
            val shown = BrandGuardAlertManager(this).showTestWarning()
            statusView.text = statusText() + if (shown) {
                "\n\nTest warning requested. Check Android notifications."
            } else {
                "\n\nAllow BrandGuard notifications in Android Settings to show the test warning."
            }
        })

        content.addView(sectionHeading("Optional website sharing"))
        content.addView(TextView(this).apply {
            text = "Sharing is off until you explicitly opt in and pair this device. Pairing uses a "
                .plus("one-time code and a private key stored in Android Keystore. Only risk level, ")
                .plus("generic detection reasons, and detection time are sent. Message text, sender, ")
                .plus("app identity, and links are never sent. A signed monitoring-status heartbeat ")
                .plus("is also sent so the website can report CONNECTED only while this service is active.")
            textSize = 14f
            setPadding(0, 0, 0, 12)
        })

        backendUrlInput = EditText(this).apply {
            hint = "BrandGuard website origin, e.g. https://your-site.vercel.app"
            inputType = android.text.InputType.TYPE_CLASS_TEXT or
                android.text.InputType.TYPE_TEXT_VARIATION_URI
            setSingleLine(true)
            setText(preferences.getString(KEY_BACKEND_URL, ""))
        }
        content.addView(backendUrlInput, matchWidth())

        pairingCodeInput = EditText(this).apply {
            hint = "One-time pairing code"
            inputType = android.text.InputType.TYPE_CLASS_TEXT or
                android.text.InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            setSingleLine(true)
        }
        content.addView(pairingCodeInput, matchWidth())

        shareSummariesCheckBox = CheckBox(this).apply {
            text = "I consent to send threat summaries (risk level, generic reasons, timestamp) and monitoring status to this BrandGuard backend."
            isChecked = preferences.getBoolean(KEY_SHARE_SUMMARIES, false)
            setOnCheckedChangeListener { _, checked ->
                preferences.edit().putBoolean(KEY_SHARE_SUMMARIES, checked).apply()
                statusView.text = statusText()
            }
        }
        content.addView(shareSummariesCheckBox, matchWidth())

        pairButton = actionButton("Pair device using one-time code") {
            pairDevice()
        }
        content.addView(pairButton)
        unpairButton = actionButton("Unpair and delete synced summaries") {
            unpairDevice()
        }
        content.addView(unpairButton)

        content.addView(TextView(this).apply {
            text = "To create a one-time code, configure DATABASE_URL for the website backend "
                .plus("and run npm run android:pair-code in the project. The code expires after ")
                .plus("10 minutes and can be used once. Unpairing deletes summaries stored for ")
                .plus("this device; turning sharing off stops future uploads.")
            textSize = 13f
            setPadding(0, 16, 0, 0)
        })

        content.addView(TextView(this).apply {
            text = "Setup is not verified until the app is installed, permissions are granted, "
                .plus("pairing succeeds, and supported-app notifications are tested on a real phone.")
            textSize = 13f
            setPadding(0, 16, 0, 0)
        })
        refreshControls()
    }

    override fun onResume() {
        super.onResume()
        if (::statusView.isInitialized) {
            if (!isListenerAccessGranted() &&
                preferences.getBoolean(KEY_MONITORING_ENABLED, false)
            ) {
                preferences.edit().putBoolean(KEY_MONITORING_ENABLED, false).apply()
                reportRevokedAccess()
            }
            refreshControls()
        }
    }

    override fun onDestroy() {
        background.shutdown()
        super.onDestroy()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_NOTIFICATIONS) {
            refreshControls()
        }
    }

    private fun pairDevice() {
        val backendUrl = backendUrlInput.text.toString().trim()
        val pairingCode = pairingCodeInput.text.toString().trim()
        if (!shareSummariesCheckBox.isChecked) {
            statusView.text = statusText() + "\n\nPairing requires explicit consent to share threat summaries and monitoring status."
            return
        }
        if (backendUrl.isBlank() || pairingCode.isBlank()) {
            statusView.text = statusText() + "\n\nEnter the HTTPS website URL and one-time pairing code."
            return
        }

        preferences.edit().putString(KEY_BACKEND_URL, backendUrl).apply()
        pairButton.isEnabled = false
        statusView.text = statusText() + "\n\nPairing with the BrandGuard backend…"
        background.execute {
            val deviceId = preferences.getString(KEY_DEVICE_ID, null) ?: UUID.randomUUID().toString()
            try {
                BrandGuardBackendClient(backendUrl).pair(pairingCode, deviceId)
                preferences.edit()
                    .putString(KEY_DEVICE_ID, deviceId)
                    .putLong(KEY_LAST_SYNC_AT, 0L)
                    .apply()
                runOnUiThread {
                    pairingCodeInput.text.clear()
                    refreshControls("Pairing accepted. The website waits for a fresh notification-listener heartbeat before reporting CONNECTED.")
                }
            } catch (error: Exception) {
                android.util.Log.w(TAG, "Pairing failed (${error.javaClass.simpleName})")
                runOnUiThread {
                    refreshControls("Pairing failed. Check the HTTPS URL, code, and backend setup.")
                }
            }
        }
    }

    private fun unpairDevice() {
        val deviceId = preferences.getString(KEY_DEVICE_ID, null)
        val backendUrl = preferences.getString(KEY_BACKEND_URL, null)
        if (deviceId == null || backendUrl == null) {
            statusView.text = statusText() + "\n\nThis device is not paired."
            return
        }

        unpairButton.isEnabled = false
        preferences.edit().putBoolean(KEY_MONITORING_ENABLED, false).apply()
        statusView.text = statusText() + "\n\nRemoving this device and its stored threat summaries…"
        background.execute {
            try {
                BrandGuardBackendClient(backendUrl).unpair(deviceId)
                DeviceKeyStore().delete()
                preferences.edit()
                    .remove(KEY_DEVICE_ID)
                    .remove(KEY_LAST_SYNC_AT)
                    .putBoolean(KEY_SHARE_SUMMARIES, false)
                    .apply()
                runOnUiThread {
                    shareSummariesCheckBox.isChecked = false
                    refreshControls("Device unpaired. The backend deleted this device's stored summaries.")
                }
            } catch (error: Exception) {
                android.util.Log.w(TAG, "Unpair failed (${error.javaClass.simpleName})")
                runOnUiThread {
                    refreshControls("Unpair failed. The device remains paired; try again when online.")
                }
            }
        }
    }

    private fun setMonitoringEnabled(enabled: Boolean) {
        if (enabled && !isListenerAccessGranted()) {
            statusView.text = statusText() +
                "\n\nGrant Notification Access in Android Settings before enabling monitoring."
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            return
        }

        preferences.edit().putBoolean(KEY_MONITORING_ENABLED, enabled).apply()
        refreshControls(if (enabled) {
            "Monitoring enabled. Notification text is analyzed locally; sharing remains controlled by consent."
        } else {
            "Monitoring paused. Notification contents will not be read or analyzed."
        })
    }

    private fun reportRevokedAccess() {
        if (!preferences.getBoolean(KEY_SHARE_SUMMARIES, false)) return
        val deviceId = preferences.getString(KEY_DEVICE_ID, null) ?: return
        val backendUrl = preferences.getString(KEY_BACKEND_URL, null) ?: return
        background.execute {
            try {
                BrandGuardBackendClient(backendUrl).sendStatus(
                    deviceId = deviceId,
                    monitoringEnabled = false,
                    notificationAccess = false,
                    serviceConnected = false
                )
            } catch (error: Exception) {
                android.util.Log.w(TAG, "Permission-revoked status update failed (${error.javaClass.simpleName})")
            }
        }
    }

    private fun refreshControls(message: String? = null) {
        statusView.text = statusText() + (message?.let { "\n\n$it" } ?: "")
        val paired = preferences.getString(KEY_DEVICE_ID, null) != null
        val monitoringEnabled = preferences.getBoolean(KEY_MONITORING_ENABLED, false)
        pairButton.isEnabled = !paired
        unpairButton.isEnabled = paired
        backendUrlInput.isEnabled = !paired
        pairingCodeInput.isEnabled = !paired
        enableMonitoringButton.isEnabled = !monitoringEnabled
        pauseMonitoringButton.isEnabled = monitoringEnabled
    }

    private fun statusText(): String {
        val listenerGranted = isListenerAccessGranted()
        val notificationPermissionGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        val deviceId = preferences.getString(KEY_DEVICE_ID, null)
        val monitoringEnabled = preferences.getBoolean(KEY_MONITORING_ENABLED, false)
        val lastSyncAt = preferences.getLong(KEY_LAST_SYNC_AT, 0L)

        return buildString {
            append("Notification access: ")
            append(if (listenerGranted) "Granted in Android Settings" else "Not granted")
            append("\nWarning notification permission: ")
            append(if (notificationPermissionGranted) "Allowed" else "Not allowed")
            append("\nBackend pairing: ")
            append(if (deviceId == null) "Not paired" else "Paired")
            append("\nNotification monitoring: ")
            append(if (monitoringEnabled && listenerGranted) "Enabled locally" else "Paused")
            append("\nThreat summary sharing: ")
            append(if (preferences.getBoolean(KEY_SHARE_SUMMARIES, false)) "Consented" else "Off")
            append("\nLast summary accepted: ")
            append(if (lastSyncAt == 0L) "None" else DateFormat.getDateTimeInstance().format(Date(lastSyncAt)))
            append("\nDevice protection status: Not verified")
        }
    }

    private fun isListenerAccessGranted(): Boolean {
        val enabledListeners = Secure.getString(
            contentResolver,
            "enabled_notification_listeners"
        ).orEmpty()
        val listener = ComponentName(
            this,
            com.brandguard.drp.service.BrandGuardNotificationListener::class.java
        )
        return enabledListeners.split(':').any { ComponentName.unflattenFromString(it) == listener }
    }

    private fun requestWarningPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQUEST_NOTIFICATIONS)
        } else {
            refreshControls()
        }
    }

    private fun sectionHeading(label: String) = TextView(this).apply {
        text = label
        textSize = 19f
        setTextColor(0xFF102A43.toInt())
        setPadding(0, 24, 0, 8)
    }

    private fun actionButton(label: String, action: () -> Unit): Button =
        Button(this).apply {
            text = label
            gravity = Gravity.CENTER
            setOnClickListener { action() }
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = 8
            }
        }

    private fun matchWidth() = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT
    )

    companion object {
        private const val TAG = "BrandGuardMain"
        private const val PREFERENCES_NAME = "brandguard_device_settings"
        private const val KEY_BACKEND_URL = "backend_url"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_SHARE_SUMMARIES = "share_threat_summaries"
        private const val KEY_MONITORING_ENABLED = "notification_monitoring_enabled"
        private const val KEY_LAST_SYNC_AT = "last_summary_accepted_at"
        private const val REQUEST_NOTIFICATIONS = 1001
    }
}
