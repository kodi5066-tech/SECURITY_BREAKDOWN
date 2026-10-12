package com.brandguard.drp.engine

import java.util.Locale

class RiskDetectionEngine {
    enum class RiskLevel {
        LOW,
        MEDIUM,
        HIGH
    }

    data class AnalysisResult(
        val riskLevel: RiskLevel,
        val category: String,
        val indicators: List<String>,
        val whySuspicious: String,
        val recommendedAction: String,
        val warningAlertText: String,
        val onDeviceProcessed: Boolean = true
    )

    fun analyze(sender: String, message: String, packageName: String): AnalysisResult {
        val text = message.lowercase(Locale.ROOT)
        val searchableText = "$sender $packageName $message".lowercase(Locale.ROOT)
        val indicators = mutableListOf<String>()
        var score = 0

        val urls = URL_PATTERN.findAll(message).map { it.value }.toList()
        if (urls.isNotEmpty()) {
            indicators += "Contains an external link"
            score += 25
            if (urls.any { url -> SPOOFED_BRAND_PATTERN.containsMatchIn(url) }) {
                indicators += "Link resembles a known brand-spoofing pattern"
                score += 45
            } else if (urls.any { url -> SUSPICIOUS_TLD_PATTERN.containsMatchIn(url) }) {
                indicators += "Link uses a domain ending often abused in scams"
                score += 30
            }
        }

        val urgencyMatches = URGENCY_TERMS.filter(text::contains)
        if (urgencyMatches.isNotEmpty()) {
            indicators += "Uses urgent or threatening language"
            score += 35
        }

        val credentialMatches = CREDENTIAL_TERMS.filter(text::contains)
        if (credentialMatches.isNotEmpty()) {
            indicators += "Requests a code, password, financial detail, or payment"
            score += 40
        }

        val brandMatches = BRAND_TERMS.filter(searchableText::contains)
        if (brandMatches.isNotEmpty() &&
            (urls.isNotEmpty() || urgencyMatches.isNotEmpty() || credentialMatches.isNotEmpty())
        ) {
            indicators += "May be impersonating a recognized service"
            score += 30
        }

        return when {
            score >= 60 -> AnalysisResult(
                riskLevel = RiskLevel.HIGH,
                category = "Potential phishing or credential scam",
                indicators = indicators,
                whySuspicious = "The message combines signals commonly seen in phishing or payment scams.",
                recommendedAction = "Do not tap links or share codes. Verify using the official app or contact details.",
                warningAlertText = "BrandGuard detected a high-risk message."
            )
            score >= 25 -> AnalysisResult(
                riskLevel = RiskLevel.MEDIUM,
                category = "Suspicious message",
                indicators = indicators,
                whySuspicious = "The message contains an unverified link or pressure language.",
                recommendedAction = "Verify the sender through an official channel before responding.",
                warningAlertText = "BrandGuard found a message that needs caution."
            )
            else -> AnalysisResult(
                riskLevel = RiskLevel.LOW,
                category = "No common warning signals found",
                indicators = indicators.ifEmpty { listOf("No common scam signals were identified") },
                whySuspicious = "Automated checks found no common warning signals. This is not a guarantee that the message is safe.",
                recommendedAction = "Use normal caution and verify unexpected requests independently.",
                warningAlertText = "BrandGuard did not identify common warning signals."
            )
        }
    }

    private companion object {
        val URL_PATTERN = Regex(
            """(?i)(https?://\S+|www\.\S+|[a-z0-9-]+\.(?:xyz|top|work|click|club|buzz|online|link|su|tk|ga|ml)\b\S*)"""
        )
        val SUSPICIOUS_TLD_PATTERN = Regex("""(?i)\.(?:xyz|top|work|click|club|buzz|online|link|su|tk|ga|ml)\b""")
        val SPOOFED_BRAND_PATTERN = Regex(
            """(?i)(?:paypal|chase|apple|amazon|usps|fedex|dhl|whatsapp|instagram|telegram|netflix).*(?:\.xyz|\.top|\.online|-login|-verify|-support|-security|-appeal)"""
        )
        val URGENCY_TERMS = listOf(
            "immediate action",
            "urgent",
            "account suspended",
            "will be suspended",
            "final warning",
            "arrest warrant",
            "kyc expired",
            "permanently deleted"
        )
        val CREDENTIAL_TERMS = listOf(
            "send otp",
            "share otp",
            "enter your pin",
            "verify password",
            "cvv",
            "bank details",
            "credit card number",
            "seed phrase",
            "wire transfer",
            "buy gift card",
            "pay fine"
        )
        val BRAND_TERMS = listOf(
            "paypal",
            "chase",
            "wells fargo",
            "bank of america",
            "apple",
            "amazon",
            "usps",
            "fedex",
            "dhl",
            "whatsapp",
            "instagram",
            "telegram",
            "netflix"
        )
    }
}
