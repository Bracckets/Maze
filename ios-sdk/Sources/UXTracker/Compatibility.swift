@_exported import Pollex

@available(*, deprecated, message: "Use Pollex.configure(...) and Pollex.track(...) instead.")
public final class UXTracker: @unchecked Sendable {
    public static let shared = UXTracker()

    private init() {}

    public func configure(_ config: PollexConfig) {
        Pollex.configure(config)
    }

    public func screen(_ name: String) {
        Pollex.screen(name)
    }

    public func track(
        event: String,
        screen: String? = nil,
        elementId: String? = nil,
        metadata: [String: String] = [:],
        x: CGFloat? = nil,
        y: CGFloat? = nil
    ) {
        Pollex.track(
            event: event,
            screen: screen,
            elementId: elementId,
            metadata: metadata,
            x: x,
            y: y
        )
    }
}
