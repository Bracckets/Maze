package com.maze.uxtracker

import com.maze.sdk.Maze

typealias MazeConfig = com.maze.sdk.MazeConfig
typealias MazeSession = com.maze.sdk.MazeSession

@Deprecated("Use com.maze.sdk.Maze instead.")
object UXTracker {
    fun configure(config: MazeConfig) {
        Maze.configure(config)
    }

    fun screen(name: String) {
        Maze.screen(name)
    }

    fun track(
        event: String,
        screen: String? = null,
        elementId: String? = null,
        metadata: Map<String, String> = emptyMap(),
        x: Float? = null,
        y: Float? = null
    ) {
        Maze.track(
            event = event,
            screen = screen,
            elementId = elementId,
            metadata = metadata,
            x = x,
            y = y
        )
    }

    fun setSessionCaptureEnabled(enabled: Boolean) {
        Maze.setSessionCaptureEnabled(enabled)
    }
}
