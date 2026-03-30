package com.maze.uxtracker

import android.content.res.Resources
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentLinkedQueue

data class UXEvent(
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
    val metadata: Map<String, String>
)

object SessionManager {
    private var sessionId: String = UUID.randomUUID().toString()

    fun currentSessionId(): String = sessionId

    fun reset() {
        sessionId = UUID.randomUUID().toString()
    }
}

private class NetworkClient(
    private val endpoint: String,
    private val apiKey: String,
    private val client: OkHttpClient = OkHttpClient()
) {
    fun send(events: List<UXEvent>) {
        val jsonEvents = events.joinToString(separator = ",") { event ->
            """
            {
              "event_id":"${event.event_id}",
              "session_id":"${event.session_id}",
              "device_id":"${event.device_id}",
              "occurred_at":"${event.occurred_at}",
              "event":"${event.event}",
              "screen":${event.screen?.let { "\"$it\"" } ?: "null"},
              "element_id":${event.element_id?.let { "\"$it\"" } ?: "null"},
              "x":${event.x?.toString() ?: "null"},
              "y":${event.y?.toString() ?: "null"},
              "screen_width":${event.screen_width?.toString() ?: "null"},
              "screen_height":${event.screen_height?.toString() ?: "null"},
              "app_version":${event.app_version?.let { "\"$it\"" } ?: "null"},
              "metadata":${event.metadata.entries.joinToString(prefix = "{", postfix = "}") { "\"${it.key}\":\"${it.value}\"" }}
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
}

private class EventQueue(
    private val networkClient: NetworkClient,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO)
) {
    private val buffer = ConcurrentLinkedQueue<UXEvent>()
    private var scheduledFlush: Job? = null

    fun enqueue(event: UXEvent) {
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
        val events = mutableListOf<UXEvent>()
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

data class MazeConfig(
    val apiKey: String,
    val deviceId: String,
    val endpoint: String = "http://10.0.2.2:8000/events",
    val appVersion: String? = null
)

object UXTracker {
    private var currentScreen: String? = null
    private var config: MazeConfig? = null
    private var queue: EventQueue? = null

    fun configure(config: MazeConfig) {
        this.config = config
        this.queue = EventQueue(NetworkClient(config.endpoint, config.apiKey))
    }

    fun screen(name: String) {
        currentScreen = name
        track(event = "screen_view", screen = name, elementId = null, metadata = emptyMap(), x = null, y = null)
    }

    fun track(
        event: String,
        screen: String? = null,
        elementId: String?,
        metadata: Map<String, String>,
        x: Float? = null,
        y: Float? = null
    ) {
        val activeConfig = requireNotNull(config) { "Call UXTracker.configure(MazeConfig) before tracking events." }
        val activeQueue = requireNotNull(queue) { "Tracker queue is not initialized." }
        val safeMetadata = metadata.mapValues { (_, value) ->
            if (value.length > 24) "***" else value
        }
        val displayMetrics = Resources.getSystem().displayMetrics
        val normalizedX = x?.let { (it / displayMetrics.widthPixels).coerceIn(0f, 1f) }
        val normalizedY = y?.let { (it / displayMetrics.heightPixels).coerceIn(0f, 1f) }

        activeQueue.enqueue(
            UXEvent(
                event_id = UUID.randomUUID().toString(),
                session_id = SessionManager.currentSessionId(),
                device_id = activeConfig.deviceId,
                occurred_at = Instant.now().toString(),
                event = event,
                screen = screen ?: currentScreen,
                element_id = elementId,
                x = normalizedX,
                y = normalizedY,
                screen_width = displayMetrics.widthPixels.toFloat(),
                screen_height = displayMetrics.heightPixels.toFloat(),
                app_version = activeConfig.appVersion,
                metadata = safeMetadata
            )
        )
    }
}
