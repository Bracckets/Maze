import Foundation
import UIKit

public actor PollexSession {
    public static let shared = PollexSession()
    private var sessionId: String = UUID().uuidString

    public func currentSessionId() -> String { sessionId }

    public func reset() {
        sessionId = UUID().uuidString
    }
}

public struct PollexConfig: Sendable {
    public static let recommendedBlockedScreens = [
        "login",
        "signup",
        "otp_verification",
        "password_reset",
        "payment",
        "kyc_id_upload",
    ]

    public let apiKey: String
    public let deviceId: String
    public let endpoint: URL
    public let screenshotEndpoint: URL
    public let liquidEndpoint: URL
    public let appVersion: String?
    public let sessionCaptureEnabled: Bool
    public let screenshotQuality: CGFloat
    public let screenshotMaxDimension: CGFloat
    public let captureAllowedScreens: [String]?
    public let captureBlockedScreens: [String]
    public let captureStatusHandler: (@Sendable (Bool) -> Void)?
    public let captureEvaluator: (@Sendable (String?) -> Bool)?
    public let liquidCacheTTLSeconds: TimeInterval

    public init(
        apiKey: String,
        deviceId: String,
        endpoint: URL = URL(string: "http://127.0.0.1:8000/events")!,
        liquidEndpoint: URL? = nil,
        appVersion: String? = nil,
        sessionCaptureEnabled: Bool = false,
        screenshotQuality: CGFloat = 0.72,
        screenshotMaxDimension: CGFloat = 1280,
        captureAllowedScreens: [String]? = nil,
        captureBlockedScreens: [String] = PollexConfig.recommendedBlockedScreens,
        captureStatusHandler: (@Sendable (Bool) -> Void)? = nil,
        captureEvaluator: (@Sendable (String?) -> Bool)? = nil,
        liquidCacheTTLSeconds: TimeInterval = 60
    ) {
        self.apiKey = apiKey
        self.deviceId = deviceId
        self.endpoint = endpoint
        self.screenshotEndpoint = endpoint.deletingLastPathComponent().appendingPathComponent("screenshots")
        self.liquidEndpoint = liquidEndpoint ?? endpoint.deletingLastPathComponent().appendingPathComponent("liquid/runtime/bundles/resolve")
        self.appVersion = appVersion
        self.sessionCaptureEnabled = sessionCaptureEnabled
        self.screenshotQuality = screenshotQuality
        self.screenshotMaxDimension = screenshotMaxDimension
        self.captureAllowedScreens = captureAllowedScreens
        self.captureBlockedScreens = captureBlockedScreens
        self.captureStatusHandler = captureStatusHandler
        self.captureEvaluator = captureEvaluator
        self.liquidCacheTTLSeconds = liquidCacheTTLSeconds
    }
}

public struct PollexEvent: Codable {
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
    let platform: String
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
        case platform
        case metadata
    }
}

public struct PollexLiquidRequest: Encodable, Sendable {
    public let screenKey: String
    public let locale: String?
    public let subjectId: String?
    public let platform: String
    public let appVersion: String?
    public let country: String?
    public let traits: [String: String]

    public init(
        screenKey: String,
        locale: String? = nil,
        subjectId: String? = nil,
        platform: String = "ios",
        appVersion: String? = nil,
        country: String? = nil,
        traits: [String: String] = [:]
    ) {
        self.screenKey = screenKey
        self.locale = locale
        self.subjectId = subjectId
        self.platform = platform
        self.appVersion = appVersion
        self.country = country
        self.traits = traits
    }
}

public struct PollexLiquidExperimentAssignment: Codable, Sendable {
    public let experimentKey: String
    public let arm: String
}

public struct PollexLiquidResolvedItem: Codable, Sendable {
    public let key: String
    public let text: String
    public let icon: String?
    public let visibility: String
    public let emphasis: String
    public let ordering: Int
    public let locale: String
    public let source: String
    public let experiment: PollexLiquidExperimentAssignment?
}

public struct PollexLiquidBundle: Codable, Sendable {
    public let screenKey: String
    public let stage: String
    public let revision: Int
    public let etag: String
    public let ttlSeconds: Int
    public let generatedAt: String
    public let items: [PollexLiquidResolvedItem]
}

actor NetworkClient {
    private let config: PollexConfig
    private let session: URLSession

    init(config: PollexConfig, session: URLSession = .shared) {
        self.config = config
        self.session = session
    }

    func send(events: [PollexEvent]) async throws {
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
        if let screen { appendField("screen", screen) }
        if let width { appendField("width", String(width)) }
        if let height { appendField("height", String(height)) }

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
        throw NSError(domain: "Pollex", code: 1, userInfo: [NSLocalizedDescriptionKey: "screenshot_id missing in response"])
    }

    func resolveLiquidBundle(requestPayload: PollexLiquidRequest) async throws -> PollexLiquidBundle {
        var request = URLRequest(url: config.liquidEndpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(config.apiKey, forHTTPHeaderField: "X-API-Key")
        request.httpBody = try JSONEncoder().encode(requestPayload)
        let (data, _) = try await session.data(for: request)
        return try JSONDecoder().decode(PollexLiquidBundle.self, from: data)
    }
}

actor EventQueue {
    private let flushIntervalNanoseconds: UInt64 = 5_000_000_000
    private let maxBatchSize = 20
    private let client: NetworkClient
    private var buffer: [PollexEvent] = []
    private var flushTask: Task<Void, Never>?

    init(client: NetworkClient) {
        self.client = client
    }

    func enqueue(_ event: PollexEvent) {
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

private final class PollexClient: @unchecked Sendable {
    static let shared = PollexClient()

    private let isoFormatter = ISO8601DateFormatter()
    private let lock = NSLock()
    private var currentScreen: String?
    private var config: PollexConfig?
    private var queue: EventQueue?
    private var sessionCaptureEnabled = false
    private var captureAllowedScreens: Set<String>?
    private var captureBlockedScreens = Set<String>()
    private var captureEvaluator: (@Sendable (String?) -> Bool)?
    private var captureStatusHandler: (@Sendable (Bool) -> Void)?
    private var liquidCache: [String: (expiresAt: Date, bundle: PollexLiquidBundle)] = [:]

    private init() {}

    func configure(_ config: PollexConfig) {
        validateEndpoint(config.endpoint)
        lock.lock()
        self.config = config
        queue = EventQueue(client: NetworkClient(config: config))
        currentScreen = nil
        sessionCaptureEnabled = config.sessionCaptureEnabled
        captureAllowedScreens = config.captureAllowedScreens.map { Set($0) }
        captureBlockedScreens = Set(config.captureBlockedScreens)
        captureEvaluator = config.captureEvaluator
        captureStatusHandler = config.captureStatusHandler
        liquidCache.removeAll()
        lock.unlock()
        config.captureStatusHandler?(config.sessionCaptureEnabled)
    }

    func setSessionCaptureEnabled(_ enabled: Bool) {
        lock.lock()
        sessionCaptureEnabled = enabled
        let statusHandler = captureStatusHandler
        lock.unlock()
        statusHandler?(enabled)
    }

    func setCaptureAllowedScreens(_ screens: [String]?) {
        lock.lock()
        captureAllowedScreens = screens.map { Set($0) }
        lock.unlock()
    }

    func setCaptureBlockedScreens(_ screens: [String]) {
        lock.lock()
        captureBlockedScreens = Set(screens)
        lock.unlock()
    }

    func setScreenCaptureEnabled(_ enabled: Bool, for screen: String) {
        lock.lock()
        if enabled {
            captureBlockedScreens.remove(screen)
        } else {
            captureBlockedScreens.insert(screen)
        }
        lock.unlock()
    }

    func screen(_ name: String) {
        lock.lock()
        currentScreen = name
        lock.unlock()
        track(event: "screen_view", screen: name, elementId: nil, metadata: [:], x: nil, y: nil)
    }

    func track(
        event: String,
        screen: String? = nil,
        elementId: String?,
        metadata: [String: String],
        x: CGFloat? = nil,
        y: CGFloat? = nil
    ) {
        guard let snapshot = snapshot(screenOverride: screen) else {
            assertionFailure("Call Pollex.configure(PollexConfig) before tracking events.")
            return
        }

        Task {
            let sessionId = await PollexSession.shared.currentSessionId()
            let heatmapMetadata = await MainActor.run {
                Self.enrichHeatmapMetadata(metadata: metadata, x: x, y: y)
            }
            let sanitizedMetadata = heatmapMetadata.mapValues { $0.count > 24 ? "***" : $0 }
            let bounds = UIScreen.main.bounds
            let normalizedX = x.map { Double(min(max($0 / bounds.width, 0), 1)) }
            let normalizedY = y.map { Double(min(max($0 / bounds.height, 0), 1)) }
            var screenshotId: String? = nil
            if event == "screen_view", snapshot.captureEnabled {
                screenshotId = await captureAndUploadScreenshot(
                    config: snapshot.config,
                    queue: snapshot.queue,
                    sessionId: sessionId,
                    screen: snapshot.screen
                )
            }

            let payload = PollexEvent(
                eventId: UUID().uuidString,
                sessionId: sessionId,
                deviceId: snapshot.config.deviceId,
                occurredAt: isoFormatter.string(from: Date()),
                event: event,
                screen: snapshot.screen,
                elementId: elementId,
                x: normalizedX,
                y: normalizedY,
                screenWidth: Double(bounds.width),
                screenHeight: Double(bounds.height),
                appVersion: snapshot.config.appVersion,
                screenshotId: screenshotId,
                platform: "ios",
                metadata: sanitizedMetadata
            )
            await snapshot.queue.enqueue(payload)
        }
    }

    @MainActor
    private static func enrichHeatmapMetadata(
        metadata: [String: String],
        x: CGFloat?,
        y: CGFloat?
    ) -> [String: String] {
        guard
            let x,
            let y,
            let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
            let window = windowScene.windows.first(where: { $0.isKeyWindow })
        else {
            return metadata
        }

        let pointInWindow = CGPoint(x: x, y: y)
        guard let scrollView = scrollContainer(for: pointInWindow, in: window) else {
            return metadata
        }

        let pointInScrollView = scrollView.convert(pointInWindow, from: window)
        let contentWidth = max(scrollView.contentSize.width, scrollView.bounds.width)
        let contentHeight = max(scrollView.contentSize.height, scrollView.bounds.height)
        guard contentWidth > 0, contentHeight > 0 else {
            return metadata
        }

        var enriched = metadata
        enriched["__pollex_page_x"] = formatNormalizedCoordinate(
            (scrollView.contentOffset.x + pointInScrollView.x) / contentWidth
        )
        enriched["__pollex_page_y"] = formatNormalizedCoordinate(
            (scrollView.contentOffset.y + pointInScrollView.y) / contentHeight
        )
        return enriched
    }

    @MainActor
    private static func scrollContainer(for pointInWindow: CGPoint, in window: UIWindow) -> UIScrollView? {
        var candidate = window.hitTest(pointInWindow, with: nil)
        while let view = candidate {
            if let scrollView = view as? UIScrollView {
                let contentWidth = max(scrollView.contentSize.width, scrollView.bounds.width)
                let contentHeight = max(scrollView.contentSize.height, scrollView.bounds.height)
                if contentWidth > scrollView.bounds.width || contentHeight > scrollView.bounds.height {
                    return scrollView
                }
            }
            candidate = view.superview
        }
        return nil
    }

    private static func formatNormalizedCoordinate(_ value: CGFloat) -> String {
        let clamped = min(max(value, 0), 1)
        return String(format: "%.6f", clamped)
    }

    func resolveLiquidBundle(
        screen: String,
        locale: String? = nil,
        subjectId: String? = nil,
        country: String? = nil,
        traits: [String: String] = [:],
        completion: @escaping @Sendable (Result<PollexLiquidBundle, Error>) -> Void
    ) {
        guard let snapshot = liquidSnapshot() else {
            assertionFailure("Call Pollex.configure(PollexConfig) before resolving Liquid bundles.")
            return
        }
        let cacheKey = [
            screen,
            locale ?? "",
            subjectId ?? "",
            country ?? "",
            traits.keys.sorted().map { "\($0)=\(traits[$0] ?? "")" }.joined(separator: "|"),
        ].joined(separator: "::")

        lock.lock()
        if let cached = liquidCache[cacheKey], cached.expiresAt > Date() {
            lock.unlock()
            completion(.success(cached.bundle))
            return
        }
        lock.unlock()

        Task {
            do {
                let bundle = try await snapshot.client.resolveLiquidBundle(
                    requestPayload: PollexLiquidRequest(
                        screenKey: screen,
                        locale: locale,
                        subjectId: subjectId,
                        platform: "ios",
                        appVersion: snapshot.config.appVersion,
                        country: country,
                        traits: traits
                    )
                )
                let ttl = bundle.ttlSeconds > 0 ? TimeInterval(bundle.ttlSeconds) : snapshot.config.liquidCacheTTLSeconds
                lock.lock()
                liquidCache[cacheKey] = (expiresAt: Date().addingTimeInterval(ttl), bundle: bundle)
                lock.unlock()
                completion(.success(bundle))
            } catch {
                completion(.failure(error))
            }
        }
    }

    func clearLiquidCache() {
        lock.lock()
        liquidCache.removeAll()
        lock.unlock()
    }

    private func snapshot(screenOverride: String?) -> (config: PollexConfig, queue: EventQueue, screen: String?, captureEnabled: Bool)? {
        lock.lock()
        defer { lock.unlock() }
        guard let config, let queue else { return nil }
        let activeScreen = screenOverride ?? currentScreen
        return (config, queue, activeScreen, shouldCapture(screen: activeScreen))
    }

    private func liquidSnapshot() -> (config: PollexConfig, client: NetworkClient)? {
        lock.lock()
        defer { lock.unlock() }
        guard let config else { return nil }
        return (config, NetworkClient(config: config))
    }

    private func shouldCapture(screen: String?) -> Bool {
        guard sessionCaptureEnabled else { return false }
        if let captureEvaluator, captureEvaluator(screen) == false { return false }
        if let screen, captureBlockedScreens.contains(screen) { return false }
        if let captureAllowedScreens, let screen {
            return captureAllowedScreens.contains(screen)
        }
        return captureAllowedScreens == nil
    }

    private func captureAndUploadScreenshot(
        config: PollexConfig,
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
            guard let resized = PollexClient.resize(image: image, maxDimension: config.screenshotMaxDimension),
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
        if largest <= maxDimension { return image }
        let scale = maxDimension / largest
        let target = CGSize(width: width * scale, height: height * scale)
        let renderer = UIGraphicsImageRenderer(size: target)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: target))
        }
    }

    private func validateEndpoint(_ endpoint: URL) {
        let host = endpoint.host?.lowercased()
        let isLocalhost = host == "127.0.0.1" || host == "localhost"
        if endpoint.scheme?.lowercased() != "https", !isLocalhost {
            assertionFailure("Pollex recommends HTTPS endpoints for production SDK traffic.")
        }
    }
}

public enum Pollex {
    public static func configure(_ config: PollexConfig) {
        PollexClient.shared.configure(config)
    }

    public static func screen(_ name: String) {
        PollexClient.shared.screen(name)
    }

    public static func track(
        event: String,
        screen: String? = nil,
        elementId: String? = nil,
        metadata: [String: String] = [:],
        x: CGFloat? = nil,
        y: CGFloat? = nil
    ) {
        PollexClient.shared.track(
            event: event,
            screen: screen,
            elementId: elementId,
            metadata: metadata,
            x: x,
            y: y
        )
    }

    public static func setSessionCaptureEnabled(_ enabled: Bool) {
        PollexClient.shared.setSessionCaptureEnabled(enabled)
    }

    public static func setCaptureAllowedScreens(_ screens: [String]?) {
        PollexClient.shared.setCaptureAllowedScreens(screens)
    }

    public static func setCaptureBlockedScreens(_ screens: [String]) {
        PollexClient.shared.setCaptureBlockedScreens(screens)
    }

    public static func setScreenCaptureEnabled(_ enabled: Bool, for screen: String) {
        PollexClient.shared.setScreenCaptureEnabled(enabled, for: screen)
    }

    public static func resolveLiquidBundle(
        screen: String,
        locale: String? = nil,
        subjectId: String? = nil,
        country: String? = nil,
        traits: [String: String] = [:],
        completion: @escaping @Sendable (Result<PollexLiquidBundle, Error>) -> Void
    ) {
        PollexClient.shared.resolveLiquidBundle(
            screen: screen,
            locale: locale,
            subjectId: subjectId,
            country: country,
            traits: traits,
            completion: completion
        )
    }

    public static func clearLiquidCache() {
        PollexClient.shared.clearLiquidCache()
    }
}
