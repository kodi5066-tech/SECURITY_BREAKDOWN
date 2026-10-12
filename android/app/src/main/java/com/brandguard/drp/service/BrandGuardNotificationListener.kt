package com.brandguard.drp.service

import android.app.Notification
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings.Secure
import android.content.ComponentName
import android.content.SharedPreferences
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.brandguard.drp.engine.RiskDetectionEngine
import com.brandguard.drp.network.BrandGuardBackendClient
import com.brandguard.drp.notifications.BrandGuardAlertManager
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.UUID
import java.util.Date

class BrandGuardNotificationListener : NotificationListenerService() {
    private val riskDetectionEngine = RiskDetectionEngine()
    private val background = Executors.newSingleThreadExecutor()
    private val heartbeatHandler = Handler(Looper.getMainLooper())
    private lateinit var alertManager: BrandGuardAlertManager
    private lateinit var preferences: SharedPreferences
    @Volatile private var listenerConnected = false
    private val preferenceListener = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
        if (key == KEY_MONITORING_ENABLED && listenerConnected) {
            sendStatusHeartbeat()
        }
    }

    private val heartbeatTask = object : Runnable {
        override fun run() {
            sendStatusHeartbeat()
            heartbeatHandler.postDelayed(this, HEARTBEAT_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        preferences = getSharedPreferences(PREFERENCES_NAME, MODE_PRIVATE)
        preferences.registerOnSharedPreferenceChangeListener(preferenceListener)
        alertManager = BrandGuardAlertManager(this)
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        listenerConnected = true
        heartbeatHandler.removeCallbacks(heartbeatTask)
        heartbeatTask.run()
    }

    override fun onListenerDisconnected() {
        listenerConnected = false
        heartbeatHandler.removeCallbacks(heartbeatTask)
        sendStatusHeartbeat()
        super.onListenerDisconnected()
        requestRebind(ComponentName(this, BrandGuardNotificationListener::class.java))
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName == packageName || sbn.isOngoing) return
        if (sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return

        val sourceApp = sbn.packageName
        if (sourceApp !in SUPPORTED_PACKAGES) return
        if (!preferences.getBoolean(KEY_MONITORING_ENABLED, false)) return

        val notification = sbn.notification
        val extras = notification.extras ?: return
        val sender = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val message = extractMessageText(notification, extras) ?: return
        if (!shouldAnalyze(sbn.key)) return

        val analysis = riskDetectionEngine.analyze(
            sender = sender,
            message = message,
            packageName = sourceApp
        )
        if (analysis.riskLevel == RiskDetectionEngine.RiskLevel.LOW) return

        alertManager.showWarning(
            notificationId = sbn.key.hashCode() and Int.MAX_VALUE,
            appName = getSourceAppName(sourceApp),
            analysis = analysis
        )
        shareThreatSummaryIfConsented(analysis)
    }

    private fun extractMessageText(
        notification: Notification,
        extras: android.os.Bundle
    ): String? {
        val messagingStyleText = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            Notification.MessagingStyle
                .extractMessagingStyleFromNotification(notification)
                ?.messages
                ?.takeLast(MAX_MESSAGES_FROM_STYLE)
                ?.mapNotNull { it.text?.toString()?.takeIf(String::isNotBlank) }
                ?.joinToString("\n")
                .orEmpty()
        } else {
            ""
        }
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString().orEmpty()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
        val lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
            ?.mapNotNull { it?.toString()?.takeIf(String::isNotBlank) }
            .orEmpty()

        return (messagingStyleText.ifBlank { bigText.ifBlank { text.ifBlank { lines.joinToString("\n") } } })
            .trim()
            .take(MAX_NOTIFICATION_TEXT_LENGTH)
            .takeIf(String::isNotBlank)
    }

    private fun shouldAnalyze(notificationKey: String): Boolean {
        val now = System.currentTimeMillis()
        val previous = recentlyAnalyzed.put(notificationKey, now)
        recentlyAnalyzed.entries.removeIf { now - it.value > DEDUPLICATION_WINDOW_MS }
        return previous == null || now - previous > DEDUPLICATION_WINDOW_MS
    }

    private fun shareThreatSummaryIfConsented(analysis: RiskDetectionEngine.AnalysisResult) {
        if (!preferences.getBoolean(KEY_SHARE_SUMMARIES, false)) return

        val deviceId = preferences.getString(KEY_DEVICE_ID, null) ?: return
        val backendUrl = preferences.getString(KEY_BACKEND_URL, null) ?: return
        val eventId = UUID.randomUUID().toString()
        val detectedAt = Date()

        background.execute {
            if (
                !preferences.getBoolean(KEY_SHARE_SUMMARIES, false) ||
                preferences.getString(KEY_DEVICE_ID, null) != deviceId ||
                !preferences.getBoolean(KEY_MONITORING_ENABLED, false)
            ) {
                return@execute
            }

            try {
                BrandGuardBackendClient(backendUrl).sendThreatSummary(
                    deviceId = deviceId,
                    eventId = eventId,
                    analysis = analysis,
                    detectedAt = detectedAt
                )
                preferences.edit()
                    .putLong(KEY_LAST_SYNC_AT, System.currentTimeMillis())
                    .apply()
            } catch (error: Exception) {
                android.util.Log.w(TAG, "Threat summary upload failed (${error.javaClass.simpleName})")
            }
        }
    }

    private fun sendStatusHeartbeat() {
        if (!preferences.getBoolean(KEY_SHARE_SUMMARIES, false)) return
        val deviceId = preferences.getString(KEY_DEVICE_ID, null) ?: return
        val backendUrl = preferences.getString(KEY_BACKEND_URL, null) ?: return
        val monitoringEnabled = preferences.getBoolean(KEY_MONITORING_ENABLED, false)
        val notificationAccess = isListenerAccessGranted()
        val serviceIsConnected = listenerConnected

        background.execute {
            try {
                BrandGuardBackendClient(backendUrl).sendStatus(
                    deviceId = deviceId,
                    monitoringEnabled = monitoringEnabled,
                    notificationAccess = notificationAccess,
                    serviceConnected = serviceIsConnected
                )
            } catch (error: Exception) {
                android.util.Log.w(TAG, "Status heartbeat failed (${error.javaClass.simpleName})")
            }
        }
    }

    private fun isListenerAccessGranted(): Boolean {
        val enabledListeners = Secure.getString(
            contentResolver,
            "enabled_notification_listeners"
        ).orEmpty()
        val listener = ComponentName(this, BrandGuardNotificationListener::class.java)
        return enabledListeners.split(':')
            .any { ComponentName.unflattenFromString(it) == listener }
    }

    private fun getSourceAppName(sourceApp: String): String =
        try {
            val appInfo = packageManager.getApplicationInfo(sourceApp, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (_: android.content.pm.PackageManager.NameNotFoundException) {
            "A supported messaging app"
        }

    private companion object {
        const val PREFERENCES_NAME = "brandguard_device_settings"
        const val KEY_DEVICE_ID = "device_id"
        const val KEY_BACKEND_URL = "backend_url"
        const val KEY_SHARE_SUMMARIES = "share_threat_summaries"
        const val KEY_MONITORING_ENABLED = "notification_monitoring_enabled"
        const val KEY_LAST_SYNC_AT = "last_summary_accepted_at"
        const val HEARTBEAT_INTERVAL_MS = 25_000L
        const val DEDUPLICATION_WINDOW_MS = 10_000L
        const val MAX_MESSAGES_FROM_STYLE = 5
        const val MAX_NOTIFICATION_TEXT_LENGTH = 4_000
        val recentlyAnalyzed = ConcurrentHashMap<String, Long>()

        val SUPPORTED_PACKAGES = setOf(
            "com.whatsapp",
            "org.telegram.messenger"
        )
    }

    override fun onDestroy() {
        listenerConnected = false
        heartbeatHandler.removeCallbacks(heartbeatTask)
        sendStatusHeartbeat()
        preferences.unregisterOnSharedPreferenceChangeListener(preferenceListener)
        background.shutdown()
        super.onDestroy()
    }
}
