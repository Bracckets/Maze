@_exported import Maze

@available(*, deprecated, message: "Use Maze.configure(...) and Maze.track(...) instead.")
public final class UXTracker: @unchecked Sendable {
    public static let shared = UXTracker()

    private init() {}

    public func configure(_ config: MazeConfig) {
        Maze.configure(config)
    }

    public func screen(_ name: String) {
        Maze.screen(name)
    }

    public func track(
        event: String,
        screen: String? = nil,
        elementId: String? = nil,
        metadata: [String: String] = [:],
        x: CGFloat? = nil,
        y: CGFloat? = nil
    ) {
        Maze.track(
            event: event,
            screen: screen,
            elementId: elementId,
            metadata: metadata,
            x: x,
            y: y
        )
    }
}
