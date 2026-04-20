import type {
  PollexConfig,
  PollexEventPayload,
  PollexFetch,
  PollexLiquidBundle,
  PollexLiquidResolveOptions,
  PollexTrackOptions,
} from "./types";

const DEFAULT_ENDPOINT = "http://127.0.0.1:8000/events";
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_FLUSH_INTERVAL_MS = 5_000;
const DEFAULT_LIQUID_CACHE_TTL_SECONDS = 60;
const DEFAULT_STORAGE_PREFIX = "pollex";
const DEFAULT_SCREENSHOT_QUALITY = 0.72;
const DEFAULT_SCREENSHOT_MAX_DIMENSION = 1_280;
const RETRY_DELAY_MS = 2_000;
const METADATA_MASK = "***";
const METADATA_MAX_LENGTH = 24;
const DEFAULT_CAPTURE_BLOCKED_SCREENS = [
  "login",
  "signup",
  "otp_verification",
  "password_reset",
  "payment",
  "kyc_id_upload",
];

type ResolvedConfig = {
  apiKey: string;
  endpoint: string;
  screenshotEndpoint: string;
  liquidEndpoint: string;
  appVersion: string | null;
  deviceId: string;
  batchSize: number;
  flushIntervalMs: number;
  liquidCacheTTLSeconds: number;
  storagePrefix: string;
  sessionCaptureEnabled: boolean;
  screenshotQuality: number;
  screenshotMaxDimension: number;
  captureAllowedScreens: string[] | null;
  captureBlockedScreens: string[];
  captureEvaluator: ((screen: string | null) => boolean) | null;
  fetchImpl: PollexFetch;
};

type FlushOptions = {
  keepalive?: boolean;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type CacheEntry = {
  bundle: PollexLiquidBundle;
  expiresAt: number;
};

type Html2CanvasModule = (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>;

export class PollexClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PollexClientError";
  }
}

export class PollexClient {
  private config: ResolvedConfig | null = null;
  private currentScreen: string | null = null;
  private queue: PollexEventPayload[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private inflightFlush: Promise<void> | null = null;
  private liquidCache = new Map<string, CacheEntry>();
  private listenersAttached = false;
  private memoryDeviceId: string | null = null;
  private memorySessionId: string | null = null;

  private readonly pagehideListener = () => {
    void this.flushInternal({ keepalive: true }).catch(() => {
      // Best-effort browser shutdown flush.
    });
  };

  private readonly visibilityListener = () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      void this.flushInternal({ keepalive: true }).catch(() => {
        // Best-effort browser shutdown flush.
      });
    }
  };

  configure(config: PollexConfig): void {
    if (!config.apiKey.trim()) {
      throw new PollexClientError("Pollex.configure(...) requires a non-empty apiKey.");
    }

    const endpoint = normalizeUrl(config.endpoint ?? DEFAULT_ENDPOINT);
    const storagePrefix = config.storagePrefix?.trim() || DEFAULT_STORAGE_PREFIX;
    const resolvedConfig: ResolvedConfig = {
      apiKey: config.apiKey.trim(),
      endpoint,
      screenshotEndpoint: normalizeUrl(config.screenshotEndpoint ?? deriveSiblingEndpoint(endpoint, "screenshots")),
      liquidEndpoint: normalizeUrl(config.liquidEndpoint ?? deriveSiblingEndpoint(endpoint, "liquid/runtime/bundles/resolve")),
      appVersion: config.appVersion?.trim() || null,
      deviceId: this.resolveDeviceId({ ...config, storagePrefix }),
      batchSize: normalizePositiveInteger(config.batchSize, DEFAULT_BATCH_SIZE),
      flushIntervalMs: normalizePositiveInteger(config.flushIntervalMs, DEFAULT_FLUSH_INTERVAL_MS),
      liquidCacheTTLSeconds: normalizePositiveInteger(config.liquidCacheTTLSeconds, DEFAULT_LIQUID_CACHE_TTL_SECONDS),
      storagePrefix,
      sessionCaptureEnabled: config.sessionCaptureEnabled ?? false,
      screenshotQuality: normalizeFraction(config.screenshotQuality, DEFAULT_SCREENSHOT_QUALITY),
      screenshotMaxDimension: normalizePositiveInteger(config.screenshotMaxDimension, DEFAULT_SCREENSHOT_MAX_DIMENSION),
      captureAllowedScreens: normalizeScreenList(config.captureAllowedScreens),
      captureBlockedScreens:
        config.captureBlockedScreens === undefined
          ? DEFAULT_CAPTURE_BLOCKED_SCREENS
          : normalizeScreenList(config.captureBlockedScreens) ?? [],
      captureEvaluator: config.captureEvaluator ?? null,
      fetchImpl: config.fetchImpl ?? getDefaultFetch(),
    };

    this.config = resolvedConfig;
    this.liquidCache.clear();
    this.ensureSessionId(resolvedConfig.storagePrefix);
    this.attachLifecycleListeners();
  }

  screen(name: string): void {
    this.ensureConfigured();
    this.currentScreen = name;
    void this.enqueueScreenView(name);
  }

  track(event: string, options: PollexTrackOptions = {}): void {
    this.ensureConfigured();
    const normalizedEvent = event.trim();
    if (!normalizedEvent) {
      throw new PollexClientError("Pollex.track(...) requires a non-empty event name.");
    }

    if (normalizedEvent === "screen_view") {
      const screen = options.screen ?? this.currentScreen;
      this.currentScreen = screen ?? this.currentScreen;
      void this.enqueueScreenView(screen, options);
      return;
    }

    this.enqueueEvent(normalizedEvent, options, null);
  }

  async flush(): Promise<void> {
    this.ensureConfigured();
    await this.flushInternal();
  }

  resetSession(): void {
    const config = this.ensureConfigured();
    const nextSession = createId();
    this.memorySessionId = nextSession;
    this.writeStorage(`${config.storagePrefix}_session_id`, nextSession, getSessionStorage());
  }

  async resolveLiquidBundle(options: PollexLiquidResolveOptions): Promise<PollexLiquidBundle> {
    const config = this.ensureConfigured();
    const traits = sortRecord(options.traits ?? {});
    const cacheKey = [
      options.screen,
      options.locale ?? "",
      options.subjectId ?? "",
      options.country ?? "",
      JSON.stringify(traits),
    ].join("::");

    const cached = this.liquidCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.bundle;
    }

    const response = await config.fetchImpl(config.liquidEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey,
      },
      body: JSON.stringify({
        screenKey: options.screen,
        locale: options.locale ?? null,
        subjectId: options.subjectId ?? null,
        platform: "web",
        appVersion: config.appVersion,
        country: options.country ?? null,
        traits,
      }),
    });

    const body = (await parseJson(response)) as PollexLiquidBundle | { detail?: string };
    if (!response.ok) {
      throw new PollexClientError(readErrorMessage(body, `Pollex Liquid request failed with status ${response.status}.`));
    }

    const bundle = body as PollexLiquidBundle;
    const ttlSeconds = bundle.ttlSeconds > 0 ? bundle.ttlSeconds : config.liquidCacheTTLSeconds;
    this.liquidCache.set(cacheKey, {
      bundle,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return bundle;
  }

  clearLiquidCache(): void {
    this.liquidCache.clear();
  }

  private async enqueueScreenView(screen: string | null, options: PollexTrackOptions = {}): Promise<void> {
    const screenshotId = await this.captureAndUploadScreenshot(screen);
    this.enqueueEvent(
      "screen_view",
      {
        ...options,
        screen: screen ?? undefined,
      },
      screenshotId,
    );
  }

  private enqueueEvent(event: string, options: PollexTrackOptions = {}, screenshotId: string | null): void {
    const config = this.ensureConfigured();
    const viewport = getViewport();
    const screen = options.screen ?? this.currentScreen;
    const payload: PollexEventPayload = {
      event_id: createId(),
      session_id: this.ensureSessionId(config.storagePrefix),
      device_id: config.deviceId,
      occurred_at: new Date().toISOString(),
      event,
      screen: screen ?? null,
      element_id: options.elementId ?? null,
      x: normalizeCoordinate(options.x, viewport.width),
      y: normalizeCoordinate(options.y, viewport.height),
      screen_width: viewport.width,
      screen_height: viewport.height,
      app_version: config.appVersion,
      screenshot_id: screenshotId,
      platform: "web",
      metadata: sanitizeMetadata(options.metadata),
    };

    this.queue.push(payload);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    const config = this.ensureConfigured();

    if (this.queue.length >= config.batchSize) {
      void this.flushInternal().catch(() => {
        // Retry scheduling happens inside flushInternal.
      });
      return;
    }

    if (this.flushTimer !== null) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flushInternal().catch(() => {
        // Retry scheduling happens inside flushInternal.
      });
    }, config.flushIntervalMs);
  }

  private async flushInternal(options: FlushOptions = {}): Promise<void> {
    const config = this.ensureConfigured();

    if (this.inflightFlush) {
      return this.inflightFlush;
    }

    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.queue.length);
    this.inflightFlush = this.sendBatch(batch, config, options)
      .catch((error) => {
        this.queue = [...batch, ...this.queue];
        this.scheduleRetry();
        throw error;
      })
      .finally(() => {
        this.inflightFlush = null;
      });

    return this.inflightFlush;
  }

  private async sendBatch(batch: PollexEventPayload[], config: ResolvedConfig, options: FlushOptions): Promise<void> {
    const response = await config.fetchImpl(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey,
      },
      body: JSON.stringify({ events: batch }),
      keepalive: options.keepalive ?? false,
    });

    if (!response.ok) {
      const body = await parseJson(response);
      throw new PollexClientError(readErrorMessage(body, `Pollex event upload failed with status ${response.status}.`));
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer !== null) {
      return;
    }

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.flushInternal().catch(() => {
        // Retry scheduling happens inside flushInternal.
      });
    }, RETRY_DELAY_MS);
  }

  private resolveDeviceId(config: Pick<PollexConfig, "deviceId" | "storagePrefix">): string {
    const storagePrefix = config.storagePrefix?.trim() || DEFAULT_STORAGE_PREFIX;
    if (config.deviceId?.trim()) {
      const explicit = config.deviceId.trim();
      this.memoryDeviceId = explicit;
      this.writeStorage(`${storagePrefix}_device_id`, explicit, getLocalStorage());
      return explicit;
    }

    const storageKey = `${storagePrefix}_device_id`;
    const stored = this.readStorage(storageKey, getLocalStorage());
    if (stored) {
      this.memoryDeviceId = stored;
      return stored;
    }

    const next = this.memoryDeviceId ?? createId();
    this.memoryDeviceId = next;
    this.writeStorage(storageKey, next, getLocalStorage());
    return next;
  }

  private ensureSessionId(storagePrefix: string): string {
    const storageKey = `${storagePrefix}_session_id`;
    const stored = this.readStorage(storageKey, getSessionStorage());
    if (stored) {
      this.memorySessionId = stored;
      return stored;
    }

    const next = this.memorySessionId ?? createId();
    this.memorySessionId = next;
    this.writeStorage(storageKey, next, getSessionStorage());
    return next;
  }

  private attachLifecycleListeners(): void {
    if (this.listenersAttached || typeof window === "undefined") {
      return;
    }

    window.addEventListener("pagehide", this.pagehideListener);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.visibilityListener);
    }
    this.listenersAttached = true;
  }

  private ensureConfigured(): ResolvedConfig {
    if (!this.config) {
      throw new PollexClientError("Call Pollex.configure(...) before using the Pollex web SDK.");
    }
    return this.config;
  }

  private shouldCaptureScreen(config: ResolvedConfig, screen: string | null): boolean {
    if (!config.sessionCaptureEnabled || typeof window === "undefined" || typeof document === "undefined") {
      return false;
    }
    if (!screen) {
      return false;
    }
    if (config.captureEvaluator && config.captureEvaluator(screen) === false) {
      return false;
    }
    if (config.captureBlockedScreens.includes(screen)) {
      return false;
    }
    return config.captureAllowedScreens === null || config.captureAllowedScreens.includes(screen);
  }

  private async captureAndUploadScreenshot(screen: string | null): Promise<string | null> {
    const config = this.ensureConfigured();
    if (!this.shouldCaptureScreen(config, screen)) {
      return null;
    }

    const viewport = getViewport();
    if (viewport.width === null || viewport.height === null || viewport.width <= 0 || viewport.height <= 0) {
      return null;
    }

    const html2canvas = await loadHtml2Canvas().catch(() => null);
    if (!html2canvas) {
      return null;
    }

    const root = document.documentElement;
    if (!root) {
      return null;
    }

    const captureScale = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    const canvas = await html2canvas(root, {
      backgroundColor: "#111111",
      logging: false,
      useCORS: true,
      scale: captureScale,
      width: viewport.width,
      height: viewport.height,
      windowWidth: viewport.width,
      windowHeight: viewport.height,
      x: window.scrollX,
      y: window.scrollY,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      ignoreElements: (element: Element) => element instanceof HTMLElement && element.dataset.pollexIgnore === "true",
    }).catch(() => null);

    if (!canvas) {
      return null;
    }

    const resizedCanvas = resizeCanvas(canvas, config.screenshotMaxDimension);
    const blob = await canvasToBlob(resizedCanvas, "image/jpeg", config.screenshotQuality).catch(() => null);
    if (!blob) {
      return null;
    }
    if (!screen) {
      return null;
    }

    return this.uploadScreenshotBlob(config, {
      blob,
      screen,
      sessionId: this.ensureSessionId(config.storagePrefix),
      width: resizedCanvas.width,
      height: resizedCanvas.height,
    }).catch(() => null);
  }

  private async uploadScreenshotBlob(
    config: ResolvedConfig,
    payload: { blob: Blob; screen: string; sessionId: string; width: number; height: number },
  ): Promise<string> {
    const body = new FormData();
    body.append("session_id", payload.sessionId);
    body.append("screen", payload.screen);
    body.append("width", String(payload.width));
    body.append("height", String(payload.height));
    body.append("screenshot", payload.blob, "capture.jpg");

    const response = await config.fetchImpl(config.screenshotEndpoint, {
      method: "POST",
      headers: {
        "X-API-Key": config.apiKey,
      },
      body,
    });
    const parsed = (await parseJson(response)) as { screenshot_id?: string; detail?: string };
    if (!response.ok || !parsed.screenshot_id) {
      throw new PollexClientError(readErrorMessage(parsed, `Pollex screenshot upload failed with status ${response.status}.`));
    }
    return parsed.screenshot_id;
  }

  private readStorage(key: string, storage: StorageLike | null): string | null {
    if (!storage) {
      return null;
    }

    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, value: string, storage: StorageLike | null): void {
    if (!storage) {
      return;
    }

    try {
      storage.setItem(key, value);
    } catch {
      // Fall back to in-memory identifiers when storage is unavailable.
    }
  }
}

function getDefaultFetch(): PollexFetch {
  if (typeof fetch !== "function") {
    throw new PollexClientError("No fetch implementation is available. Pass fetchImpl to Pollex.configure(...).");
  }
  return fetch;
}

function deriveSiblingEndpoint(endpoint: string, path: string): string {
  const url = new URL(endpoint);
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length > 0) {
    segments.pop();
  }
  url.pathname = `/${[...segments, ...path.split("/").filter(Boolean)].join("/")}`;
  return normalizeUrl(url.toString());
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || value === undefined || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

function normalizeFraction(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.min(value, 1);
}

function normalizeScreenList(screens: string[] | undefined): string[] | null {
  if (!screens || screens.length === 0) {
    return null;
  }

  const normalized = screens.map((screen) => screen.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : null;
}

function sanitizeMetadata(metadata: Record<string, string> | undefined): Record<string, string> {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, value.length > METADATA_MAX_LENGTH ? METADATA_MASK : value]),
  );
}

function normalizeCoordinate(value: number | undefined, max: number | null): number | null {
  if (value === undefined || value === null || max === null || max <= 0) {
    return null;
  }

  const normalized = value / max;
  return Math.min(Math.max(normalized, 0), 1);
}

function getViewport(): { width: number | null; height: number | null } {
  if (typeof window === "undefined") {
    return { width: null, height: null };
  }

  const width = window.innerWidth > 0 ? window.innerWidth : null;
  const height = window.innerHeight > 0 ? window.innerHeight : null;
  return { width, height };
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getLocalStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") {
    return body.detail;
  }
  return fallback;
}

function sortRecord(input: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(input).sort(([left], [right]) => left.localeCompare(right)));
}

async function loadHtml2Canvas(): Promise<Html2CanvasModule> {
  const module = await import("html2canvas");
  return (module.default ?? module) as Html2CanvasModule;
}

function resizeCanvas(source: HTMLCanvasElement, maxDimension: number): HTMLCanvasElement {
  const largestDimension = Math.max(source.width, source.height);
  if (largestDimension <= maxDimension) {
    return source;
  }

  const scale = maxDimension / largestDimension;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    return source;
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new PollexClientError("Unable to encode screenshot."));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}
