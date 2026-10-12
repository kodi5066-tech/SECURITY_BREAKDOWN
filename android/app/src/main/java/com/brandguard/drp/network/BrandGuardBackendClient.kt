package com.brandguard.drp.network

import android.net.Uri
import com.brandguard.drp.engine.RiskDetectionEngine
import com.brandguard.drp.security.DeviceKeyStore
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

class BrandGuardBackendClient(
    private val baseUrl: String,
    private val deviceKeyStore: DeviceKeyStore = DeviceKeyStore()
) {
    fun pair(pairingCode: String, deviceId: String) {
        val body = JSONObject()
            .put("pairingCode", pairingCode.trim())
            .put("deviceId", deviceId)
            .put("publicKey", deviceKeyStore.publicKeyBase64())
            .toString()
        val response = execute(
            method = "POST",
            path = PAIR_PATH,
            body = body
        )
        if (response.statusCode != 201 || JSONObject(response.body).optBoolean("paired").not()) {
            throw IOException("Pairing request was rejected (HTTP ${response.statusCode})")
        }
    }

    fun sendThreatSummary(
        deviceId: String,
        eventId: String,
        analysis: RiskDetectionEngine.AnalysisResult,
        detectedAt: Date
    ) {
        require(analysis.riskLevel != RiskDetectionEngine.RiskLevel.LOW)
        require(analysis.reasonCodes.isNotEmpty())

        val reasons = analysis.reasonCodes.distinct()
        val riskLevel = analysis.riskLevel.name
        val timestamp = isoTimestamp(detectedAt)
        val body = JSONObject()
            .put("eventId", eventId)
            .put("riskLevel", riskLevel)
            .put("reasons", JSONArray(reasons))
            .put("timestamp", timestamp)
            .toString()
        sendSigned(
            method = "POST",
            path = EVENTS_PATH,
            body = body,
            canonicalMessage = { requestTimestamp, nonce ->
                listOf(
                    "POST",
                    EVENTS_PATH,
                    requestTimestamp,
                    nonce,
                    eventId,
                    riskLevel,
                    timestamp,
                    reasons.joinToString(",")
                ).joinToString("\n")
            },
            deviceId = deviceId
        )
    }

    fun sendStatus(
        deviceId: String,
        monitoringEnabled: Boolean,
        notificationAccess: Boolean,
        serviceConnected: Boolean
    ) {
        val body = JSONObject()
            .put("monitoringEnabled", monitoringEnabled)
            .put("notificationAccess", notificationAccess)
            .put("serviceConnected", serviceConnected)
            .toString()
        sendSigned(
            method = "POST",
            path = STATUS_PATH,
            body = body,
            canonicalMessage = { requestTimestamp, nonce ->
                listOf(
                    "POST",
                    STATUS_PATH,
                    requestTimestamp,
                    nonce,
                    monitoringEnabled.toString(),
                    notificationAccess.toString(),
                    serviceConnected.toString()
                ).joinToString("\n")
            },
            deviceId = deviceId
        )
    }

    fun unpair(deviceId: String) {
        sendSigned(
            method = "DELETE",
            path = DEVICE_PATH,
            body = "",
            canonicalMessage = { requestTimestamp, nonce ->
                listOf("DELETE", DEVICE_PATH, requestTimestamp, nonce).joinToString("\n")
            },
            deviceId = deviceId
        )
    }

    private fun sendSigned(
        method: String,
        path: String,
        body: String,
        canonicalMessage: (String, String) -> String,
        deviceId: String
    ) {
        val timestamp = System.currentTimeMillis().toString()
        val nonce = UUID.randomUUID().toString()
        val signature = deviceKeyStore.sign(canonicalMessage(timestamp, nonce))
        val response = execute(
            method = method,
            path = path,
            body = body,
            headers = mapOf(
                "X-BG-Device-Id" to deviceId,
                "X-BG-Timestamp" to timestamp,
                "X-BG-Nonce" to nonce,
                "X-BG-Signature" to signature
            )
        )
        if (response.statusCode !in 200..299) {
            throw IOException("Authenticated backend request failed (HTTP ${response.statusCode})")
        }
    }

    private fun execute(
        method: String,
        path: String,
        body: String,
        headers: Map<String, String> = emptyMap()
    ): HttpResponse {
        val root = validateBaseUrl(baseUrl)
        val connection = URL("$root$path").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = CONNECT_TIMEOUT_MS
            connection.readTimeout = READ_TIMEOUT_MS
            connection.instanceFollowRedirects = false
            connection.setRequestProperty("Accept", "application/json")
            headers.forEach { (name, value) -> connection.setRequestProperty(name, value) }

            if (body.isNotEmpty()) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                connection.outputStream.use { output ->
                    output.write(body.toByteArray(Charsets.UTF_8))
                }
            }

            val responseStream = if (connection.responseCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream
            }
            val responseBody = responseStream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            return HttpResponse(connection.responseCode, responseBody)
        } finally {
            connection.disconnect()
        }
    }

    private fun validateBaseUrl(value: String): String {
        val trimmed = value.trim().removeSuffix("/")
        val uri = Uri.parse(trimmed)
        require(uri.scheme.equals("https", ignoreCase = true)) {
            "Backend URL must use HTTPS"
        }
        require(!uri.host.isNullOrBlank() && uri.userInfo == null &&
            uri.query == null && uri.fragment == null &&
            (uri.path.isNullOrEmpty() || uri.path == "/")
        ) {
            "Enter only the HTTPS backend origin, without a path or credentials"
        }
        return trimmed
    }

    private fun isoTimestamp(date: Date): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(date)

    private data class HttpResponse(val statusCode: Int, val body: String)

    private companion object {
        const val PAIR_PATH = "/api/android/pair"
        const val EVENTS_PATH = "/api/android/events"
        const val DEVICE_PATH = "/api/android/device"
        const val STATUS_PATH = "/api/android/status"
        const val CONNECT_TIMEOUT_MS = 8_000
        const val READ_TIMEOUT_MS = 8_000
    }
}
