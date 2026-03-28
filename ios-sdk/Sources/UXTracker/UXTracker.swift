import Foundation

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

public struct UXEvent: Codable {
    let userId: String
    let sessionId: String
    let timestamp: String
    let event: String
    let screen: String
    let elementId: String?
    let metadata: [String: String]
}

actor NetworkClient {
    private let endpoint: URL
    private let session: URLSession

    init(endpoint: URL, session: URLSession = .shared) {
        self.endpoint = endpoint
        self.session = session
    }

    func send(events: [UXEvent]) async throws {
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
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

    private let queue: EventQueue
    private let isoFormatter = ISO8601DateFormatter()
    private var currentScreen: String?
    private var userId: String = "anonymous"

    private init() {
        let endpoint = URL(string: "http://127.0.0.1:8000/events")!
        queue = EventQueue(client: NetworkClient(endpoint: endpoint))
    }

    public func configure(userId: String) {
        self.userId = userId
    }

    public func screen(_ name: String) {
        currentScreen = name
        track(event: "screen_view", screen: name, elementId: nil, metadata: [:])
    }

    public func track(event: String, screen: String? = nil, elementId: String?, metadata: [String: String]) {
        let activeScreen = screen ?? currentScreen ?? "unknown"
        Task {
            let sessionId = await SessionManager.shared.currentSessionId()
            let sanitizedMetadata = metadata.mapValues { value in
                value.count > 24 ? "***" : value
            }
            let event = UXEvent(
                userId: userId,
                sessionId: sessionId,
                timestamp: isoFormatter.string(from: Date()),
                event: event,
                screen: activeScreen,
                elementId: elementId,
                metadata: sanitizedMetadata
            )
            await queue.enqueue(event)
        }
    }
}
