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
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.brandguard.drp.notifications.BrandGuardAlertManager

class MainActivity : Activity() {
    private lateinit var statusView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 40, 32, 32)
        }
        val scrollView = ScrollView(this).apply {
            addView(content)
        }
        setContentView(scrollView)

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
            text = "BrandGuard can analyze only text exposed in notifications from supported apps. "
                .plus("It does not read private chats or block messages. Notification access is a sensitive ")
                .plus("Android permission; grant it only if you trust this app.")
            textSize = 14f
            setPadding(0, 20, 0, 12)
        })

        content.addView(actionButton("Open Notification Access Settings") {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        })

        content.addView(actionButton("Allow BrandGuard notifications") {
            requestWarningPermission()
        })

        content.addView(actionButton("Send test warning") {
            val manager = BrandGuardAlertManager(this)
            if (manager.showTestWarning()) {
                statusView.text = statusText() + "\n\nTest warning requested. Check Android notifications."
            } else {
                statusView.text = statusText() +
                    "\n\nAndroid notification permission is required to show the test warning."
            }
        })

        content.addView(TextView(this).apply {
            text = "Setup is not verified until the app is installed on a device, permissions are granted, "
                .plus("and a supported-app test is completed. Analysis runs on this device; notification ")
                .plus("text is not sent to the BrandGuard website.")
            textSize = 13f
            setPadding(0, 16, 0, 0)
        })
    }

    override fun onResume() {
        super.onResume()
        if (::statusView.isInitialized) {
            statusView.text = statusText()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_NOTIFICATIONS) {
            statusView.text = statusText()
        }
    }

    private fun statusText(): String {
        val listenerGranted = isListenerAccessGranted()
        val notificationPermissionGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

        return buildString {
            append("Notification access: ")
            append(if (listenerGranted) "Granted in Android Settings" else "Not granted")
            append("\nWarning notification permission: ")
            append(if (notificationPermissionGranted) "Allowed" else "Not allowed")
            append("\nDevice protection status: Not verified")
        }
    }

    private fun isListenerAccessGranted(): Boolean {
        val enabledListeners = Secure.getString(
            contentResolver,
            "enabled_notification_listeners"
        ).orEmpty()

        return enabledListeners.split(':').any { flattened ->
            ComponentName.unflattenFromString(flattened) ==
                ComponentName(this, com.brandguard.drp.service.BrandGuardNotificationListener::class.java)
        }
    }

    private fun requestWarningPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQUEST_NOTIFICATIONS)
        } else {
            statusView.text = statusText()
        }
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
        private const val REQUEST_NOTIFICATIONS = 1001
    }
}
