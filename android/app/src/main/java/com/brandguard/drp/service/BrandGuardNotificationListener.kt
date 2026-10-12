package com.brandguard.drp.service

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.brandguard.drp.engine.RiskDetectionEngine
import com.brandguard.drp.notifications.BrandGuardAlertManager
import java.util.concurrent.ConcurrentHashMap

class BrandGuardNotificationListener : NotificationListenerService() {
    private val riskDetectionEngine = RiskDetectionEngine()
    private lateinit var alertManager: BrandGuardAlertManager

    override fun onCreate() {
        super.onCreate()
        alertManager = BrandGuardAlertManager(this)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName == packageName || sbn.isOngoing) return
        if (sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return

        val sourceApp = sbn.packageName
        if (sourceApp !in SUPPORTED_PACKAGES) return

        val notification = sbn.notification
        val extras = notification.extras ?: return
        val sender = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val message = extractMessageText(notification, extras) ?: return
        if (!shouldAnalyze(sbn.key, message)) return

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
    }

    private fun extractMessageText(
        notification: Notification,
        extras: android.os.Bundle
    ): String? {
        val messagingStyleText = Notification.MessagingStyle
            .extractMessagingStyleFromNotification(notification)
            ?.messages
            ?.takeLast(MAX_MESSAGES_FROM_STYLE)
            ?.mapNotNull { it.text?.toString()?.takeIf(String::isNotBlank) }
            ?.joinToString("\n")
            .orEmpty()
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

    private fun shouldAnalyze(notificationKey: String, message: String): Boolean {
        val now = System.currentTimeMillis()
        val key = "$notificationKey:${message.hashCode()}"
        val previous = recentlyAnalyzed.put(key, now)
        recentlyAnalyzed.entries.removeIf { now - it.value > DEDUPLICATION_WINDOW_MS }
        return previous == null || now - previous > DEDUPLICATION_WINDOW_MS
    }

    private fun getSourceAppName(sourceApp: String): String =
        try {
            val appInfo = packageManager.getApplicationInfo(sourceApp, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (_: android.content.pm.PackageManager.NameNotFoundException) {
            "A supported messaging app"
        }

    private companion object {
        const val DEDUPLICATION_WINDOW_MS = 10_000L
        const val MAX_MESSAGES_FROM_STYLE = 5
        const val MAX_NOTIFICATION_TEXT_LENGTH = 4_000
        val recentlyAnalyzed = ConcurrentHashMap<String, Long>()

        val SUPPORTED_PACKAGES = setOf(
            "com.whatsapp",
            "org.telegram.messenger",
            "com.instagram.android",
            "com.google.android.apps.messaging",
            "com.samsung.android.messaging",
            "org.thoughtcrime.securesms",
            "com.facebook.orca"
        )
    }
}
