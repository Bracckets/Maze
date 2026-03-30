import Foundation
import UIKit

public actor SessionManager {
    public static let shared = SessionManager()
    private var sessionId: String = UUID().uuidString

    public func currentSessionId() -> String {
        sessionId
    }

    public func reset() {
        sessionId = UUID().uuidString
    }
}

public struct MazeConfig: Sendable {
    public let apiKey: String
    public let deviceId: String
    public let endpoint: URL
    public let appVersion: String?

    public init(
        apiKey: String,
        deviceId: String,
        endpoint: URL = URL(string: "http://127.0.0.1:8000/events")!,
        appVersion: String? = nil
    ) {
        self.apiKey = apiKey
        self.deviceId = deviceId
        self.endpoint = endpoint
        self.appVersion = appVersion
    }
}

public struct UXEvent: Codable {
    let eventId: String
    let sessionId: String
    let deviceId: String
    let occurredAt: String
    let event: String
    let screen: String?
    let elementId: String?
    let x: Double?
    let y: Double?
    let screenWidth: Double?
    let screenHeight: Double?
    let appVersion: String?
    let metadata: [String: String]

    enum CodingKeys: String, CodingKey {
        case eventId = "event_id"
        case sessionId = "session_id"
        case deviceId = "device_id"
        case occurredAt = "occurred_at"
        case event
        case screen
        case elementId = "element_id"
        case x
        case y
        case screenWidth = "screen_width"
        case screenHeight = "screen_height"
        case appVersion = "app_version"
        case metadata
    }
}

actor NetworkClient {
    private let config: MazeConfig
    private let session: URLSession

    init(config: MazeConfig, session: URLSession = .shared) {
        self.config = config
        self.session = session
    }

    func send(events: [UXEvent]) async throws {
        var request = URLRequest(url: config.endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(config.apiKey, forHTTPHeaderField: "X-API-Key")
        request.httpBody = try JSONEncoder().encode(["events": events])
        _ = try await session.data(for: request)
    }
}

actor EventQueue {
    private let flushIntervalNanoseconds: UInt64 = 5_000_000_000
    private let maxBatchSize = 20
    private let client: NetworkClient
    private var buffer: [UXEvent] = []
    private var flushTask: Task<Void, Never>?

    init(client: NetworkClient) {
        self.client = client
    }

    func enqueue(_ event: UXEvent) {
        buffer.append(event)
        scheduleFlushIfNeeded()
        if buffer.count >= maxBatchSize {
            Task { await flush() }
        }
    }

    private func scheduleFlushIfNeeded() {
        guard flushTask == nil else { return }
        flushTask = Task {
            try? await Task.sleep(nanoseconds: flushIntervalNanoseconds)
            await flush()
        }
    }

    func flush() async {
        guard !buffer.isEmpty else {
            flushTask = nil
            return
        }

        let payload = buffer
        buffer.removeAll()
        flushTask = nil

        do {
            try await client.send(events: payload)
        } catch {
            buffer.insert(contentsOf: payload, at: 0)
            flushTask = Task {
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                await flush()
            }
        }
    }
}

public final class UXTracker: @unchecked Sendable {
    public static let shared = UXTracker()

    private let isoFormatter = ISO8601DateFormatter()
    private var currentScreen: String?
    private var config: MazeConfig?
    private var queue: EventQueue?

    private init() {}

    public func configure(_ config: MazeConfig) {
        self.config = config
        self.queue = EventQueue(client: NetworkClient(config: config))
    }

    public func screen(_ name: String) {
        currentScreen = name
        track(event: "screen_view", screen: name, elementId: nil, metadata: [:], x: nil, y: nil)
    }

    public func track(
        event: String,
        screen: String? = nil,
        elementId: String?,
        metadata: [String: String],
        x: CGFloat? = nil,
        y: CGFloat? = nil
    ) {
        guard let config, let queue else {
            assertionFailure("Call UXTracker.shared.configure(MazeConfig) before tracking events.")
            return
        }

        let activeScreen = screen ?? currentScreen
        Task {
            let sessionId = await SessionManager.shared.currentSessionId()
            let sanitizedMetadata = metadata.mapValues { value in
                value.count > 24 ? "***" : value
            }
            let bounds = UIScreen.main.bounds
            let normalizedX = x.map { Double(min(max($0 / bounds.width, 0), 1)) }
            let normalizedY = y.map { Double(min(max($0 / bounds.height, 0), 1)) }
            let payload = UXEvent(
                eventId: UUID().uuidString,
                sessionId: sessionId,
                deviceId: config.deviceId,
                occurredAt: isoFormatter.string(from: Date()),
                event: event,
                screen: activeScreen,
                elementId: elementId,
                x: normalizedX,
                y: normalizedY,
                screenWidth: Double(bounds.width),
                screenHeight: Double(bounds.height),
                appVersion: config.appVersion,
                metadata: sanitizedMetadata
            )
            await queue.enqueue(payload)
        }
    }
}
