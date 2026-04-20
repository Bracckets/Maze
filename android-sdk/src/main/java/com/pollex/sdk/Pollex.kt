package com.pollex.sdk

import android.app.Activity
import android.app.Application
import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Matrix
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream
import java.io.File
import java.lang.ref.WeakReference
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.ConcurrentHashMap
import org.json.JSONArray
import org.json.JSONObject

private val recommendedBlockedCaptureScreens: Set<String> = setOf(
    "login",
    "signup",
    "otp_verification",
    "password_reset",
    "payment",
    "kyc_id_upload",
)

data class PollexEvent(
    val event_id: String,
    val session_id: String,
    val device_id: String,
    val occurred_at: String,
    val event: String,
    val screen: String?,
    val element_id: String?,
    val x: Float?,
    val y: Float?,
    val screen_width: Float?,
    val screen_height: Float?,
    val app_version: String?,
    val screenshot_id: String?,
    val platform: String,
    val metadata: Map<String, String>
)

data class PollexLiquidRequest(
    val screenKey: String,
    val locale: String? = null,
    val subjectId: String? = null,
    val platform: String = "android",
    val appVersion: String? = null,
    val country: String? = null,
    val traits: Map<String, String> = emptyMap()
)

data class PollexLiquidExperimentAssignment(
    val experimentKey: String,
    val arm: String
)

data class PollexLiquidResolvedItem(
    val key: String,
    val text: String,
    val icon: String?,
    val visibility: String,
    val emphasis: String,
    val ordering: Int,
    val locale: String,
    val source: String,
    val experiment: PollexLiquidExperimentAssignment?
)

data class PollexLiquidBundle(
    val screenKey: String,
    val stage: String,
    val revision: Int,
    val etag: String,
    val ttlSeconds: Int,
    val generatedAt: String,
    val items: List<PollexLiquidResolvedItem>
)

private data class CachedLiquidBundle(
    val bundle: PollexLiquidBundle,
    val expiresAtMillis: Long
)

object PollexSession {
    private var sessionId: String = UUID.randomUUID().toString()

    fun currentSessionId(): String = sessionId

    fun reset() {
        sessionId = UUID.randomUUID().toString()
    }
}

private class NetworkClient(
    private val endpoint: String,
    private val screenshotEndpoint: String,
    private val liquidEndpoint: String,
    private val apiKey: String,
    private val client: OkHttpClient = OkHttpClient()
) {
    private fun escapeJson(raw: String): String {
        return raw.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")
    }

    fun send(events: List<PollexEvent>) {
        val jsonEvents = events.joinToString(separator = ",") { event ->
            """
            {
              "event_id":"${escapeJson(event.event_id)}",
              "session_id":"${escapeJson(event.session_id)}",
              "device_id":"${escapeJson(event.device_id)}",
              "occurred_at":"${escapeJson(event.occurred_at)}",
              "event":"${escapeJson(event.event)}",
              "screen":${event.screen?.let { "\"${escapeJson(it)}\"" } ?: "null"},
              "element_id":${event.element_id?.let { "\"${escapeJson(it)}\"" } ?: "null"},
              "x":${event.x?.toString() ?: "null"},
              "y":${event.y?.toString() ?: "null"},
              "screen_width":${event.screen_width?.toString() ?: "null"},
              "screen_height":${event.screen_height?.toString() ?: "null"},
              "app_version":${event.app_version?.let { "\"${escapeJson(it)}\"" } ?: "null"},
              "screenshot_id":${event.screenshot_id?.let { "\"${escapeJson(it)}\"" } ?: "null"},
              "platform":"${escapeJson(event.platform)}",
              "metadata":${event.metadata.entries.joinToString(prefix = "{", postfix = "}") { "\"${escapeJson(it.key)}\":\"${escapeJson(it.value)}\"" }}
            }
            """.trimIndent()
        }

        val body = """{"events":[$jsonEvents]}""".toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url(endpoint)
            .addHeader("X-API-Key", apiKey)
            .post(body)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                error("Failed to upload events: ${response.code}")
            }
        }
    }

    fun uploadScreenshot(
        imageBytes: ByteArray,
        screen: String?,
        sessionId: String,
        width: Int,
        height: Int
    ): String {
        val tempFile = File.createTempFile("pollex_capture_", ".jpg")
        tempFile.writeBytes(imageBytes)
        try {
            val body = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("session_id", sessionId)
                .addFormDataPart("screen", screen ?: "")
                .addFormDataPart("width", width.toString())
                .addFormDataPart("height", height.toString())
                .addFormDataPart(
                    "screenshot",
                    "capture.jpg",
                    tempFile.asRequestBody("image/jpeg".toMediaType())
                )
                .build()
            val request = Request.Builder()
                .url(screenshotEndpoint)
                .addHeader("X-API-Key", apiKey)
                .post(body)
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    error("Failed to upload screenshot: ${response.code}")
                }
                val payload = response.body?.string() ?: return ""
                val match = Regex("\"screenshot_id\"\\s*:\\s*\"([^\"]+)\"").find(payload)
                return match?.groupValues?.getOrNull(1) ?: ""
            }
        } finally {
            tempFile.delete()
        }
    }

    fun resolveLiquidBundle(requestPayload: PollexLiquidRequest): PollexLiquidBundle {
        val requestJson = JSONObject().apply {
            put("screenKey", requestPayload.screenKey)
            put("locale", requestPayload.locale)
            put("subjectId", requestPayload.subjectId)
            put("platform", requestPayload.platform)
            put("appVersion", requestPayload.appVersion)
            put("country", requestPayload.country)
            put(
                "traits",
                JSONObject().apply {
                    requestPayload.traits.forEach { (key, value) -> put(key, value) }
                }
            )
        }

        val request = Request.Builder()
            .url(liquidEndpoint)
            .addHeader("X-API-Key", apiKey)
            .post(requestJson.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                error("Failed to resolve Liquid bundle: ${response.code}")
            }
            val payload = JSONObject(response.body?.string().orEmpty())
            val items = payload.optJSONArray("items") ?: JSONArray()
            return PollexLiquidBundle(
                screenKey = payload.optString("screenKey"),
                stage = payload.optString("stage"),
                revision = payload.optInt("revision"),
                etag = payload.optString("etag"),
                ttlSeconds = payload.optInt("ttlSeconds"),
                generatedAt = payload.optString("generatedAt"),
                items = (0 until items.length()).map { index ->
                    val item = items.getJSONObject(index)
                    val experimentPayload = item.optJSONObject("experiment")
                    PollexLiquidResolvedItem(
                        key = item.optString("key"),
                        text = item.optString("text"),
                        icon = item.optString("icon").takeIf { it.isNotBlank() },
                        visibility = item.optString("visibility", "visible"),
                        emphasis = item.optString("emphasis", "medium"),
                        ordering = item.optInt("ordering"),
                        locale = item.optString("locale"),
                        source = item.optString("source"),
                        experiment = experimentPayload?.let {
                            PollexLiquidExperimentAssignment(
                                experimentKey = it.optString("experimentKey"),
                                arm = it.optString("arm")
                            )
                        }
                    )
                }
            )
        }
    }
}

private class EventQueue(
    private val networkClient: NetworkClient,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO)
) {
    private val buffer = ConcurrentLinkedQueue<PollexEvent>()
    private var scheduledFlush: Job? = null

    fun enqueue(event: PollexEvent) {
        buffer.add(event)
        if (buffer.size >= 20) {
            flush()
            return
        }
        if (scheduledFlush == null) {
            scheduledFlush = scope.launch {
                delay(5_000)
                flush()
            }
        }
    }

    fun flush() {
        val events = mutableListOf<PollexEvent>()
        while (true) {
            val event = buffer.poll() ?: break
            events.add(event)
        }
        scheduledFlush?.cancel()
        scheduledFlush = null

        if (events.isEmpty()) {
            return
        }

        scope.launch {
            runCatching {
                networkClient.send(events)
            }.onFailure {
                events.forEach(buffer::add)
                delay(2_000)
                flush()
            }
        }
    }
}

data class PollexConfig(
    val apiKey: String,
    val deviceId: String,
    val endpoint: String = "http://10.0.2.2:8000/events",
    val liquidEndpoint: String = endpoint.replace("/events", "/liquid/runtime/bundles/resolve"),
    val appVersion: String? = null,
    val sessionCaptureEnabled: Boolean = false,
    val screenshotQuality: Int = 72,
    val screenshotMaxDimension: Int = 1280,
    val screenshotEndpoint: String = endpoint.replace("/events", "/screenshots"),
    val application: Application? = null,
    val captureAllowedScreens: Set<String>? = null,
    val captureBlockedScreens: Set<String> = recommendedBlockedCaptureScreens,
    val captureStatusListener: ((Boolean) -> Unit)? = null,
    val captureEvaluator: ((String?) -> Boolean)? = null,
    val liquidCacheTtlSeconds: Long = 60,
)

object ActivityTracker : Application.ActivityLifecycleCallbacks {
    private var currentRef: WeakReference<Activity>? = null
    private var attached = false

    fun attach(app: Application) {
        if (attached) {
            return
        }
        app.registerActivityLifecycleCallbacks(this)
        attached = true
    }

    fun current(): Activity? = currentRef?.get()

    override fun onActivityResumed(activity: Activity) {
        currentRef = WeakReference(activity)
    }

    override fun onActivityStarted(activity: Activity) {}
    override fun onActivityPaused(activity: Activity) {}
    override fun onActivityStopped(activity: Activity) {}
    override fun onActivitySaveInstanceState(activity: Activity, outState: android.os.Bundle) {}
    override fun onActivityCreated(activity: Activity, savedInstanceState: android.os.Bundle?) {}
    override fun onActivityDestroyed(activity: Activity) {}
}

object Pollex {
    private var currentScreen: String? = null
    private var config: PollexConfig? = null
    private var queue: EventQueue? = null
    private var networkClient: NetworkClient? = null
    private val workerScope = CoroutineScope(Dispatchers.IO)
    private val liquidCache = ConcurrentHashMap<String, CachedLiquidBundle>()

    @Volatile private var sessionCaptureEnabled: Boolean = false
    @Volatile private var captureAllowedScreens: Set<String>? = null
    @Volatile private var captureBlockedScreens: Set<String> = emptySet()
    @Volatile private var captureStatusListener: ((Boolean) -> Unit)? = null
    @Volatile private var captureEvaluator: ((String?) -> Boolean)? = null

    fun configure(config: PollexConfig) {
        validateEndpoint(config.endpoint)
        this.config = config
        sessionCaptureEnabled = config.sessionCaptureEnabled
        captureAllowedScreens = config.captureAllowedScreens
        captureBlockedScreens = config.captureBlockedScreens
        captureStatusListener = config.captureStatusListener
        captureEvaluator = config.captureEvaluator
        if (config.application != null) {
            ActivityTracker.attach(config.application)
        }
        networkClient = NetworkClient(config.endpoint, config.screenshotEndpoint, config.liquidEndpoint, config.apiKey)
        queue = EventQueue(requireNotNull(networkClient))
        captureStatusListener?.invoke(sessionCaptureEnabled)
    }

    fun setSessionCaptureEnabled(enabled: Boolean) {
        sessionCaptureEnabled = enabled
        captureStatusListener?.invoke(enabled)
    }

    fun setCaptureAllowedScreens(screens: Set<String>?) {
        captureAllowedScreens = screens
    }

    fun setCaptureBlockedScreens(screens: Set<String>) {
        captureBlockedScreens = screens
    }

    fun setScreenCaptureEnabled(enabled: Boolean, screen: String) {
        captureBlockedScreens = if (enabled) captureBlockedScreens - screen else captureBlockedScreens + screen
    }

    fun screen(name: String) {
        currentScreen = name
        val activeConfig = requireNotNull(config) { "Call Pollex.configure(PollexConfig) before tracking events." }
        val activeQueue = requireNotNull(queue) { "Tracker queue is not initialized." }
        val client = requireNotNull(networkClient) { "Network client is not initialized." }
        workerScope.launch {
            val screenshotId = if (shouldCapture(name)) {
                runCatching { captureAndUploadScreenshot(activeConfig, client, name) }.getOrNull()
            } else {
                null
            }
            enqueueEvent(activeConfig, activeQueue, "screen_view", name, null, emptyMap(), null, null, screenshotId)
        }
    }

    fun track(
        event: String,
        screen: String? = null,
        elementId: String? = null,
        metadata: Map<String, String> = emptyMap(),
        x: Float? = null,
        y: Float? = null
    ) {
        val activeConfig = requireNotNull(config) { "Call Pollex.configure(PollexConfig) before tracking events." }
        val activeQueue = requireNotNull(queue) { "Tracker queue is not initialized." }
        workerScope.launch {
            enqueueEvent(activeConfig, activeQueue, event, screen ?: currentScreen, elementId, metadata, x, y, null)
        }
    }

    fun resolveLiquidBundle(
        screen: String,
        locale: String? = null,
        subjectId: String? = null,
        country: String? = null,
        traits: Map<String, String> = emptyMap(),
        onComplete: (Result<PollexLiquidBundle>) -> Unit
    ) {
        val activeConfig = requireNotNull(config) { "Call Pollex.configure(PollexConfig) before resolving Liquid bundles." }
        val client = requireNotNull(networkClient) { "Network client is not initialized." }
        val cacheKey = listOf(screen, locale.orEmpty(), subjectId.orEmpty(), country.orEmpty(), traits.entries.sortedBy { it.key }.joinToString("|") { "${it.key}=${it.value}" }).joinToString("::")
        val now = System.currentTimeMillis()
        liquidCache[cacheKey]?.takeIf { it.expiresAtMillis > now }?.let {
            onComplete(Result.success(it.bundle))
            return
        }

        workerScope.launch {
            val result = runCatching {
                client.resolveLiquidBundle(
                    PollexLiquidRequest(
                        screenKey = screen,
                        locale = locale,
                        subjectId = subjectId,
                        platform = "android",
                        appVersion = activeConfig.appVersion,
                        country = country,
                        traits = traits
                    )
                )
            }
            withContext(Dispatchers.Main) {
                result.onSuccess { bundle ->
                    val ttlSeconds = if (bundle.ttlSeconds > 0) bundle.ttlSeconds.toLong() else activeConfig.liquidCacheTtlSeconds
                    liquidCache[cacheKey] = CachedLiquidBundle(bundle, System.currentTimeMillis() + (ttlSeconds * 1000))
                    onComplete(Result.success(bundle))
                }.onFailure {
                    onComplete(Result.failure(it))
                }
            }
        }
    }

    fun clearLiquidCache() {
        liquidCache.clear()
    }

    private fun shouldCapture(screen: String?): Boolean {
        if (!sessionCaptureEnabled) return false
        if (captureEvaluator?.invoke(screen) == false) return false
        if (screen != null && captureBlockedScreens.contains(screen)) return false
        val allowed = captureAllowedScreens
        return allowed == null || (screen != null && allowed.contains(screen))
    }

    private suspend fun enqueueEvent(
        activeConfig: PollexConfig,
        activeQueue: EventQueue,
        event: String,
        screen: String?,
        elementId: String?,
        metadata: Map<String, String>,
        x: Float?,
        y: Float?,
        screenshotId: String?
    ) {
        val safeMetadata = metadata.mapValues { (_, value) -> if (value.length > 24) "***" else value }
        val displayMetrics = Resources.getSystem().displayMetrics
        val normalizedX = x?.let { (it / displayMetrics.widthPixels).coerceIn(0f, 1f) }
        val normalizedY = y?.let { (it / displayMetrics.heightPixels).coerceIn(0f, 1f) }

        activeQueue.enqueue(
            PollexEvent(
                event_id = UUID.randomUUID().toString(),
                session_id = PollexSession.currentSessionId(),
                device_id = activeConfig.deviceId,
                occurred_at = Instant.now().toString(),
                event = event,
                screen = screen,
                element_id = elementId,
                x = normalizedX,
                y = normalizedY,
                screen_width = displayMetrics.widthPixels.toFloat(),
                screen_height = displayMetrics.heightPixels.toFloat(),
                app_version = activeConfig.appVersion,
                screenshot_id = screenshotId,
                platform = "android",
                metadata = safeMetadata
            )
        )
    }

    private suspend fun captureAndUploadScreenshot(
        activeConfig: PollexConfig,
        client: NetworkClient,
        screenName: String
    ): String? {
        val capture = withContext(Dispatchers.Main) {
            val activity = ActivityTracker.current() ?: return@withContext null
            val root = activity.window?.decorView?.rootView ?: return@withContext null
            if (root.width <= 0 || root.height <= 0) return@withContext null
            val bitmap = Bitmap.createBitmap(root.width, root.height, Bitmap.Config.RGB_565)
            val canvas = Canvas(bitmap)
            root.draw(canvas)
            val resized = resizeBitmap(bitmap, activeConfig.screenshotMaxDimension)
            val output = ByteArrayOutputStream()
            resized.compress(Bitmap.CompressFormat.JPEG, activeConfig.screenshotQuality.coerceIn(35, 90), output)
            val bytes = output.toByteArray()
            output.close()
            val width = resized.width
            val height = resized.height
            if (resized != bitmap) resized.recycle()
            bitmap.recycle()
            Triple(bytes, width, height)
        } ?: return null

        val screenshotId = client.uploadScreenshot(
            imageBytes = capture.first,
            screen = screenName,
            sessionId = PollexSession.currentSessionId(),
            width = capture.second,
            height = capture.third
        )
        return screenshotId.ifBlank { null }
    }

    private fun resizeBitmap(source: Bitmap, maxDimension: Int): Bitmap {
        val maxSide = maxOf(source.width, source.height)
        if (maxSide <= maxDimension || maxDimension <= 0) return source
        val scale = maxDimension.toFloat() / maxSide.toFloat()
        val matrix = Matrix().apply { postScale(scale, scale) }
        return Bitmap.createBitmap(source, 0, 0, source.width, source.height, matrix, true)
    }

    private fun validateEndpoint(endpoint: String) {
        val isSecure = endpoint.startsWith("https://")
        val isLocal = endpoint.startsWith("http://127.0.0.1") || endpoint.startsWith("http://10.0.2.2") || endpoint.startsWith("http://localhost")
        check(isSecure || isLocal) { "Pollex requires HTTPS for production endpoints." }
    }
}
