export interface AndroidSourceFile {
  filename: string;
  relativePath: string;
  language: string;
  description: string;
  content: string;
}

export const ANDROID_PROJECT_FILES: AndroidSourceFile[] = [
  {
    filename: 'AndroidManifest.xml',
    relativePath: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    description: 'Declares NotificationListenerService and permissions for Android notification inspection',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.brandguard.drp">

    <!-- Permission to display warning notifications on Android 13+ (API 33+) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="BrandGuard"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.BrandGuard">

        <!-- Main UI Activity: Shows status, threat history, and permission prompts -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.BrandGuard">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- BrandGuard Notification Listener Service -->
        <!-- Requires android.permission.BIND_NOTIFICATION_LISTENER_SERVICE -->
        <service
            android:name=".service.BrandGuardNotificationListener"
            android:label="BrandGuard Threat Sentinel"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

    </application>
</manifest>`,
  },
  {
    filename: 'BrandGuardNotificationListener.kt',
    relativePath: 'app/src/main/java/com/brandguard/drp/service/BrandGuardNotificationListener.kt',
    language: 'kotlin',
    description: 'Android NotificationListenerService intercepting WhatsApp, Telegram, Instagram & SMS notifications',
    content: `package com.brandguard.drp.service

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.brandguard.drp.engine.RiskDetectionEngine
import com.brandguard.drp.notifications.BrandGuardAlertManager

class BrandGuardNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "BrandGuardListener"

        // Target messaging apps to monitor
        val MONITORED_PACKAGES = setOf(
            "com.whatsapp",                         // WhatsApp
            "org.telegram.messenger",             // Telegram
            "com.instagram.android",              // Instagram Direct
            "com.google.android.apps.messaging",  // Google Messages (SMS)
            "com.samsung.android.messaging",      // Samsung Messages
            "org.thoughtcrime.securesms",          // Signal
            "com.facebook.orca"                    // Facebook Messenger
        )
    }

    private lateinit var riskEngine: RiskDetectionEngine
    private lateinit var alertManager: BrandGuardAlertManager

    override fun onCreate() {
        super.onCreate()
        riskEngine = RiskDetectionEngine(applicationContext)
        alertManager = BrandGuardAlertManager(applicationContext)
        Log.i(TAG, "BrandGuard Notification Listener active and monitoring.")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName

        // Ignore our own warning notifications to prevent infinite loops
        if (packageName == applicationContext.packageName) return

        // Check if the notification is from a supported messaging app
        if (!MONITORED_PACKAGES.contains(packageName)) return

        val extras = sbn.notification.extras ?: return

        // Safely extract notification title & body text
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""

        val fullMessage = if (bigText.isNotBlank()) bigText else text

        if (fullMessage.isBlank()) return

        Log.d(TAG, "Inspecting message from $packageName ($title): length=\${fullMessage.length}")

        // 1. Run privacy-first, on-device risk analysis (0ms latency, zero data leaks)
        val analysis = riskEngine.analyze(
            sender = title,
            message = fullMessage,
            packageName = packageName
        )

        // 2. If threat detected, instantly fire warning notification
        if (analysis.riskLevel == RiskDetectionEngine.RiskLevel.HIGH ||
            analysis.riskLevel == RiskDetectionEngine.RiskLevel.MEDIUM) {
            
            Log.w(TAG, "THREAT DETECTED [\${analysis.riskLevel}]: \${analysis.category}")

            alertManager.showWarningAlert(
                appName = getAppName(packageName),
                sender = title,
                originalText = fullMessage,
                analysis = analysis
            )
        }
    }

    private fun getAppName(packageName: String): String {
        return when (packageName) {
            "com.whatsapp" -> "WhatsApp"
            "org.telegram.messenger" -> "Telegram"
            "com.instagram.android" -> "Instagram"
            "com.google.android.apps.messaging", "com.samsung.android.messaging" -> "SMS"
            "org.thoughtcrime.securesms" -> "Signal"
            else -> "Messaging App"
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
}`,
  },
  {
    filename: 'RiskDetectionEngine.kt',
    relativePath: 'app/src/main/java/com/brandguard/drp/engine/RiskDetectionEngine.kt',
    language: 'kotlin',
    description: 'On-device Kotlin risk evaluation engine with regex signatures, phishing detection, and urgency heuristics',
    content: `package com.brandguard.drp.engine

import android.content.Context
import java.util.regex.Pattern

class RiskDetectionEngine(private val context: Context) {

    enum class RiskLevel { LOW, MEDIUM, HIGH }

    data class AnalysisResult(
        val riskLevel: RiskLevel,
        val category: String,
        val indicators: List<String>,
        val whySuspicious: String,
        val recommendedAction: String,
        val alertTitle: String = "⚠️ BrandGuard Warning! This message may be a scam. Avoid clicking suspicious links."
    )

    // Regex for external links and suspicious TLDs
    private val urlPattern = Pattern.compile(
        "(https?://[\\\\S]+|www\\\\.[\\\\S]+|[a-zA-Z0-9-]+\\\\.(xyz|top|work|click|club|buzz|online|link|su|tk|ga|ml)\\\\b[\\\\S]*)",
        Pattern.CASE_INSENSITIVE
    )

    private val suspiciousDomainPatterns = listOf(
        Pattern.compile("bit\\\\.ly|tinyurl\\\\.com|is\\\\.gd|cutt\\\\.ly|rb\\\\.gy", Pattern.CASE_INSENSITIVE),
        Pattern.compile("paypal.*(\\\\.xyz|\\\\.top|-security|-login|-verify)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("chase.*(\\\\.xyz|\\\\.top|-alert|-login|-update)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("apple.*(\\\\.xyz|-id|-support|-icloud)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("amazon.*(\\\\.xyz|-order|-gift|-refund|-hiring)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("usps.*(\\\\.xyz|-redelivery|-customs|-fee)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("whatsapp.*(\\\\.xyz|\\\\.top|-support|-auth)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("instagram.*(\\\\.xyz|-verify|-appeal|-case)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("binance.*(\\\\.xyz|-safety|-auth)", Pattern.CASE_INSENSITIVE)
    )

    private val urgencyKeywords = listOf(
        "immediate action", "urgent", "account suspended", "will be suspended",
        "terminated within 24", "blocked in 1 hour", "deactivated immediately",
        "legal action", "police case", "arrest warrant", "final warning",
        "electricity disconnected", "kyc expired", "withdrawals frozen"
    )

    private val credentialKeywords = listOf(
        "send otp", "share otp", "enter your pin", "verify password", "cvv",
        "bank details", "credit card number", "seed phrase", "secret key",
        "wire transfer", "crypto wallet", "zelle", "redelivery fee"
    )

    private val lureKeywords = listOf(
        "congratulations you won", "lottery winner", "selected for $", "claim prize",
        "earn 500$ daily", "work from home earn", "video rating", "crypto giveaway"
    )

    fun analyze(sender: String, message: String, packageName: String): AnalysisResult {
        val lowerText = message.lowercase()
        val lowerSender = sender.lowercase()
        val indicators = mutableListOf<String>()
        var score = 0

        // 1. Link inspection
        val urlMatcher = urlPattern.matcher(message)
        if (urlMatcher.find()) {
            val url = urlMatcher.group(1) ?: ""
            indicators.add("Hyperlink detected: $url")
            score += 25

            for (spoofRegex in suspiciousDomainPatterns) {
                if (spoofRegex.matcher(url).find()) {
                    indicators.add("Spoofed domain matching threat signature: $url")
                    score += 50
                    break
                }
            }
        }

        // 2. Urgency triggers
        val matchedUrgency = urgencyKeywords.filter { lowerText.contains(it) }
        if (matchedUrgency.isNotEmpty()) {
            indicators.add("Psychological urgency coercions: \${matchedUrgency.take(2)}")
            score += 35
        }

        // 3. Credential or financial request triggers
        val matchedCreds = credentialKeywords.filter { lowerText.contains(it) }
        if (matchedCreds.isNotEmpty()) {
            indicators.add("Requests sensitive credentials / OTP / money: \${matchedCreds.take(2)}")
            score += 45
        }

        // 4. Lures & giveaways
        val matchedLures = lureKeywords.filter { lowerText.contains(it) }
        if (matchedLures.isNotEmpty()) {
            indicators.add("Fake lottery / task recruitment lure: \${matchedLures.take(2)}")
            score += 40
        }

        return when {
            score >= 60 -> AnalysisResult(
                riskLevel = RiskLevel.HIGH,
                category = "Credential Harvesting / Phishing Scam",
                indicators = indicators,
                whySuspicious = "The message creates false urgency and attempts to lure you into visiting spoofed links or sharing private credentials.",
                recommendedAction = "Do NOT tap links or reply with OTPs. Report and block the sender.",
                alertTitle = "⚠️ BrandGuard Warning! This message may be a scam. Avoid clicking suspicious links."
            )
            score >= 25 -> AnalysisResult(
                riskLevel = RiskLevel.MEDIUM,
                category = "Suspicious Unverified Message",
                indicators = indicators,
                whySuspicious = "Contains external link or high-pressure language requiring manual verification.",
                recommendedAction = "Verify sender through official contacts before proceeding.",
                alertTitle = "⚠️ BrandGuard Caution: Suspicious message detected. Verify sender before responding."
            )
            else -> AnalysisResult(
                riskLevel = RiskLevel.LOW,
                category = "Clean Communication",
                indicators = listOf("No threat signatures identified"),
                whySuspicious = "Standard messaging content.",
                recommendedAction = "Standard vigilance.",
                alertTitle = "ℹ️ BrandGuard: Safe communication."
            )
        }
    }
}`,
  },
  {
    filename: 'BrandGuardAlertManager.kt',
    relativePath: 'app/src/main/java/com/brandguard/drp/notifications/BrandGuardAlertManager.kt',
    language: 'kotlin',
    description: 'Builds instant high-priority warning notifications with sound, vibration, and actionable buttons',
    content: `package com.brandguard.drp.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.brandguard.drp.MainActivity
import com.brandguard.drp.R
import com.brandguard.drp.engine.RiskDetectionEngine

class BrandGuardAlertManager(private val context: Context) {

    companion object {
        const val CHANNEL_HIGH_RISK = "brandguard_high_risk_channel"
        const val CHANNEL_MEDIUM_RISK = "brandguard_medium_risk_channel"
        private var notificationCounter = 1000
    }

    init {
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val highChannel = NotificationChannel(
                CHANNEL_HIGH_RISK,
                "BrandGuard High Risk Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Immediate heads-up alerts when scams or phishing messages are detected"
                enableLights(true)
                lightColor = Color.RED
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 300, 150, 300)
            }

            val medChannel = NotificationChannel(
                CHANNEL_MEDIUM_RISK,
                "BrandGuard Caution Alerts",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Advisories for suspicious unverified links"
            }

            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(highChannel)
            manager.createNotificationChannel(medChannel)
        }
    }

    fun showWarningAlert(
        appName: String,
        sender: String,
        originalText: String,
        analysis: RiskDetectionEngine.AnalysisResult
    ) {
        val channelId = if (analysis.riskLevel == RiskDetectionEngine.RiskLevel.HIGH) {
            CHANNEL_HIGH_RISK
        } else {
            CHANNEL_MEDIUM_RISK
        }

        // Tap to open BrandGuard detail activity
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("EXTRA_APP_NAME", appName)
            putExtra("EXTRA_SENDER", sender)
            putExtra("EXTRA_MESSAGE", originalText)
            putExtra("EXTRA_RISK_LEVEL", analysis.riskLevel.name)
            putExtra("EXTRA_WHY", analysis.whySuspicious)
            putExtra("EXTRA_ACTION", analysis.recommendedAction)
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationCounter,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.stat_sys_warning)
            .setContentTitle(analysis.alertTitle)
            .setContentText("Detected from \$appName (\$sender). Tap to view safe actions.")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText(
                        "\${analysis.alertTitle}\\n\\n" +
                        "📱 App: \$appName\\n" +
                        "👤 Sender: \$sender\\n" +
                        "⚠️ Threat: \${analysis.category}\\n\\n" +
                        "🔍 Why Suspicious: \${analysis.whySuspicious}\\n\\n" +
                        "🛡️ Recommended: \${analysis.recommendedAction}"
                    )
            )
            .setPriority(
                if (analysis.riskLevel == RiskDetectionEngine.RiskLevel.HIGH)
                    NotificationCompat.PRIORITY_MAX
                else NotificationCompat.PRIORITY_DEFAULT
            )
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setColor(if (analysis.riskLevel == RiskDetectionEngine.RiskLevel.HIGH) Color.RED else Color.YELLOW)

        val managerCompat = NotificationManagerCompat.from(context)
        try {
            managerCompat.notify(notificationCounter++, builder.build())
        } catch (e: SecurityException) {
            // Android 13 POST_NOTIFICATIONS permission not granted
        }
    }
}`,
  },
  {
    filename: 'MainActivity.kt',
    relativePath: 'app/src/main/java/com/brandguard/drp/MainActivity.kt',
    language: 'kotlin',
    description: 'Main Android Activity with notification permission onboarding, status card, and ADB test runner',
    content: `package com.brandguard.drp

import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationManagerCompat
import com.brandguard.drp.engine.RiskDetectionEngine
import com.brandguard.drp.notifications.BrandGuardAlertManager
import com.brandguard.drp.service.BrandGuardNotificationListener

class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var btnGrantPermission: Button
    private lateinit var btnTestAlert: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusText = findViewById(R.id.tv_status)
        btnGrantPermission = findViewById(R.id.btn_grant_permission)
        btnTestAlert = findViewById(R.id.btn_test_alert)

        btnGrantPermission.setOnClickListener {
            // Direct user to Android System Notification Listener permission page
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).apply {
                    putExtra(
                        Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                        ComponentName(this@MainActivity, BrandGuardNotificationListener::class.java).flattenToString()
                    )
                }
            } else {
                Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            }
            startActivity(intent)
        }

        btnTestAlert.setOnClickListener {
            // Fire sample warning alert to verify notification system
            val alertManager = BrandGuardAlertManager(this)
            alertManager.showWarningAlert(
                appName = "WhatsApp",
                sender = "WhatsApp Support (Spoofed)",
                originalText = "Your account will be suspended in 24 hours: http://whatsapp-verify.top",
                analysis = RiskDetectionEngine.AnalysisResult(
                    riskLevel = RiskDetectionEngine.RiskLevel.HIGH,
                    category = "Credential Theft / Account Takeover Scam",
                    indicators = listOf("Spoofed domain", "Urgent coercion"),
                    whySuspicious = "The message creates false urgency and attempts to lure you into visiting spoofed links.",
                    recommendedAction = "Do NOT tap links or reply with OTPs. Report and block the sender."
                )
            )
        }
    }

    override fun onResume() {
        super.onResume()
        updatePermissionStatus()
    }

    private fun updatePermissionStatus() {
        val enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(this)
        val isGranted = enabledPackages.contains(packageName)

        if (isGranted) {
            statusText.text = "ACTIVE: Notification Access Granted\\nMonitoring WhatsApp, Telegram, Instagram & SMS"
            statusText.setTextColor(getColor(android.R.color.holo_green_dark))
            btnGrantPermission.text = "Notification Access Enabled (OK)"
            btnGrantPermission.isEnabled = false
        } else {
            statusText.text = "INACTIVE: Notification Access Required\\nGrant permission in Android Settings to detect scams"
            statusText.setTextColor(getColor(android.R.color.holo_red_dark))
            btnGrantPermission.text = "Grant Notification Access in Settings"
            btnGrantPermission.isEnabled = true
        }
    }
}`,
  },
  {
    filename: 'build.gradle.kts',
    relativePath: 'app/build.gradle.kts',
    language: 'kotlin',
    description: 'Gradle build configuration with required AndroidX dependencies',
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.brandguard.drp"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.brandguard.drp"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.2.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
}`,
  },
];
