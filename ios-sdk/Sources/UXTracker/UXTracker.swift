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
    public let screenshotEndpoint: URL
    public let appVersion: String?
    public let screenshotCaptureEnabled: Bool
    public let screenshotQuality: CGFloat
    public let screenshotMaxDimension: CGFloat

    public init(
        apiKey: String,
        deviceId: String,
        endpoint: URL = URL(string: "http://127.0.0.1:8000/events")!,
        appVersion: String? = nil,
        screenshotCaptureEnabled: Bool = true,
        screenshotQuality: CGFloat = 0.72,
        screenshotMaxDimension: CGFloat = 1280
    ) {
        self.apiKey = apiKey
        self.deviceId = deviceId
        self.endpoint = endpoint
        self.screenshotEndpoint = endpoint.deletingLastPathComponent().appendingPathComponent("screenshots")
        self.appVersion = appVersion
        self.screenshotCaptureEnabled = screenshotCaptureEnabled
        self.screenshotQuality = screenshotQuality
        self.screenshotMaxDimension = screenshotMaxDimension
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
    let screenshotId: String?
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
        case screenshotId = "screenshot_id"
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

    func uploadScreenshot(
        jpegData: Data,
        screen: String?,
        sessionId: String,
        width: Int?,
        height: Int?
    ) async throws -> String {
        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: config.screenshotEndpoint)
        request.httpMethod = "POST"
        request.setValue(config.apiKey, forHTTPHeaderField: "X-API-Key")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        func appendField(_ name: String, _ value: String) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }

        appendField("session_id", sessionId)
        if let screen {
            appendField("screen", screen)
        }
        if let width {
            appendField("width", String(width))
        }
        if let height {
            appendField("height", String(height))
        }

        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"screenshot\"; filename=\"capture.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(jpegData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body
        let (data, _) = try await session.data(for: request)
        let decoded = try JSONDecoder().decode([String: String].self, from: data)
        if let screenshotId = decoded["screenshot_id"] {
            return screenshotId
        }
        throw NSError(domain: "UXTracker", code: 1, userInfo: [NSLocalizedDescriptionKey: "screenshot_id missing in response"])
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

    func uploadScreenshot(
        jpegData: Data,
        screen: String?,
        sessionId: String,
        width: Int?,
        height: Int?
    ) async throws -> String {
        try await client.uploadScreenshot(
            jpegData: jpegData,
            screen: screen,
            sessionId: sessionId,
            width: width,
            height: height
        )
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
            var screenshotId: String? = nil
            if event == "screen_view", config.screenshotCaptureEnabled {
                screenshotId = await captureAndUploadScreenshot(
                    config: config,
                    queue: queue,
                    sessionId: sessionId,
                    screen: activeScreen
                )
            }
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
                screenshotId: screenshotId,
                metadata: sanitizedMetadata
            )
            await queue.enqueue(payload)
        }
    }

    private func captureAndUploadScreenshot(
        config: MazeConfig,
        queue: EventQueue,
        sessionId: String,
        screen: String?
    ) async -> String? {
        let capture = await MainActor.run { () -> (data: Data, width: Int, height: Int)? in
            guard
                let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                let window = windowScene.windows.first(where: { $0.isKeyWindow })
            else {
                return nil
            }
            let size = window.bounds.size
            guard size.width > 0, size.height > 0 else { return nil }
            let renderer = UIGraphicsImageRenderer(size: size)
            let image = renderer.image { context in
                window.layer.render(in: context.cgContext)
            }
            guard let resized = UXTracker.resize(image: image, maxDimension: config.screenshotMaxDimension),
                  let jpeg = resized.jpegData(compressionQuality: config.screenshotQuality) else {
                return nil
            }
            return (jpeg, Int(resized.size.width), Int(resized.size.height))
        }
        guard let capture else { return nil }
        do {
            return try await queue.uploadScreenshot(
                jpegData: capture.data,
                screen: screen,
                sessionId: sessionId,
                width: capture.width,
                height: capture.height
            )
        } catch {
            return nil
        }
    }

    @MainActor
    private static func resize(image: UIImage, maxDimension: CGFloat) -> UIImage? {
        let width = image.size.width
        let height = image.size.height
        let largest = max(width, height)
        if largest <= maxDimension {
            return image
        }
        let scale = maxDimension / largest
        let target = CGSize(width: width * scale, height: height * scale)
        let renderer = UIGraphicsImageRenderer(size: target)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: target))
        }
    }
}
