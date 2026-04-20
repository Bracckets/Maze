package com.pollex.uxtracker

import com.pollex.sdk.Pollex

typealias PollexConfig = com.pollex.sdk.PollexConfig
typealias PollexSession = com.pollex.sdk.PollexSession

@Deprecated("Use com.pollex.sdk.Pollex instead.")
object UXTracker {
    fun configure(config: PollexConfig) {
        Pollex.configure(config)
    }

    fun screen(name: String) {
        Pollex.screen(name)
    }

    fun track(
        event: String,
        screen: String? = null,
        elementId: String? = null,
        metadata: Map<String, String> = emptyMap(),
        x: Float? = null,
        y: Float? = null
    ) {
        Pollex.track(
            event = event,
            screen = screen,
            elementId = elementId,
            metadata = metadata,
            x = x,
            y = y
        )
    }

    fun setSessionCaptureEnabled(enabled: Boolean) {
        Pollex.setSessionCaptureEnabled(enabled)
    }
}
