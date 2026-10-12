package com.brandguard.drp.notifications

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import com.brandguard.drp.MainActivity
import com.brandguard.drp.engine.RiskDetectionEngine

class BrandGuardAlertManager(private val context: Context) {
    private val notificationManager =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    init {
        createNotificationChannel()
    }

    fun showWarning(
        notificationId: Int,
        appName: String,
        analysis: RiskDetectionEngine.AnalysisResult
    ): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return false
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val title = when (analysis.riskLevel) {
            RiskDetectionEngine.RiskLevel.HIGH -> "BrandGuard: High-risk message"
            RiskDetectionEngine.RiskLevel.MEDIUM -> "BrandGuard: Suspicious message"
            RiskDetectionEngine.RiskLevel.LOW -> return false
        }
        val body = "$appName: ${analysis.recommendedAction}"
        val notification = Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_warning)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(Notification.BigTextStyle().bigText(body))
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_MESSAGE)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .build()

        notificationManager.notify(notificationId, notification)
        return true
    }

    fun showTestWarning(): Boolean {
        val testResult = RiskDetectionEngine.AnalysisResult(
            riskLevel = RiskDetectionEngine.RiskLevel.HIGH,
            category = "Test warning",
            indicators = emptyList(),
            whySuspicious = "This is a local notification display test.",
            recommendedAction = "This is a test alert; no message was analyzed.",
            warningAlertText = "BrandGuard test warning"
        )
        return showWarning(TEST_NOTIFICATION_ID, "Test", testResult)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "BrandGuard threat warnings",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Warnings when supported message notifications contain common scam signals."
                lockscreenVisibility = Notification.VISIBILITY_PRIVATE
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    private companion object {
        const val CHANNEL_ID = "brandguard_threat_warnings"
        const val TEST_NOTIFICATION_ID = 0x4247
    }
}
