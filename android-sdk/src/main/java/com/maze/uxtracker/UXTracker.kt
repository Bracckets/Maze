package com.maze.uxtracker

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
    val user_id: String,
    val session_id: String,
    val timestamp: String,
    val event: String,
    val screen: String,
    val element_id: String?,
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
    private val client: OkHttpClient = OkHttpClient()
) {
    fun send(events: List<UXEvent>) {
        val jsonEvents = events.joinToString(separator = ",") { event ->
            """
            {
              "user_id":"${event.user_id}",
              "session_id":"${event.session_id}",
              "timestamp":"${event.timestamp}",
              "event":"${event.event}",
              "screen":"${event.screen}",
              "element_id":${event.element_id?.let { "\"$it\"" } ?: "null"},
              "metadata":${event.metadata.entries.joinToString(prefix = "{", postfix = "}") { "\"${it.key}\":\"${it.value}\"" }}
            }
            """.trimIndent()
        }

        val body = """{"events":[$jsonEvents]}""".toRequestBody("application/json".toMediaType())
        val request = Request.Builder().url(endpoint).post(body).build()
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

object UXTracker {
    private var currentScreen: String? = null
    private var userId: String = "anonymous"
    private val queue = EventQueue(NetworkClient("http://10.0.2.2:8000/events"))

    fun configure(userId: String) {
        this.userId = userId
    }

    fun screen(name: String) {
        currentScreen = name
        track(event = "screen_view", screen = name, elementId = null, metadata = emptyMap())
    }

    fun track(
        event: String,
        screen: String? = null,
        elementId: String?,
        metadata: Map<String, String>
    ) {
        val safeMetadata = metadata.mapValues { (_, value) ->
            if (value.length > 24) "***" else value
        }
        queue.enqueue(
            UXEvent(
                user_id = userId,
                session_id = SessionManager.currentSessionId(),
                timestamp = Instant.now().toString(),
                event = event,
                screen = screen ?: currentScreen ?: "unknown",
                element_id = elementId,
                metadata = safeMetadata
            )
        )
    }
}
