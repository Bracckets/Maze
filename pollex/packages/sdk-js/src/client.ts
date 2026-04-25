import type {
  AdaptationDecision,
  BatchAdaptationDecision,
  BatchResolveInput,
  FetchLike,
  IdentifyInput,
  InteractionEvent,
  PollexConfig,
  ResolvedPollexConfig,
  ResolveInput,
  TrackInput
} from "./types";
import { fallbackBatchDecision } from "./batch";
import { fallbackDecision, PollexClientError, warn } from "./errors";
import { toEventsPayload } from "./events";
import { toIdentifyPayload } from "./identify";
import { parseBatchDecision, parseDecision } from "./resolve";

type CacheEntry = {
  decision: AdaptationDecision;
  expiresAt: number;
};

const DEFAULT_FLUSH_INTERVAL_MS = 2_000;
const DEFAULT_MAX_BATCH_SIZE = 20;
const DEFAULT_TIMEOUT_MS = 3_000;
const RESOLVE_CACHE_TTL_MS = 30_000;

export class PollexClient {
  private readonly config: ResolvedPollexConfig;
  private readonly resolveCache = new Map<string, CacheEntry>();
  private eventQueue: InteractionEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private lifecycleAttached = false;

  constructor(config: PollexConfig & { fetchImpl?: FetchLike }) {
    if (!config.apiKey.trim()) {
      throw new PollexClientError("PollexClient requires apiKey.");
    }
    if (!config.apiBaseUrl.trim()) {
      throw new PollexClientError("PollexClient requires apiBaseUrl.");
    }
    this.config = {
      apiKey: config.apiKey.trim(),
      apiBaseUrl: config.apiBaseUrl.trim().replace(/\/+$/, ""),
      flushIntervalMs: positiveInt(config.flushIntervalMs, DEFAULT_FLUSH_INTERVAL_MS),
      maxBatchSize: positiveInt(config.maxBatchSize, DEFAULT_MAX_BATCH_SIZE),
      timeoutMs: positiveInt(config.timeoutMs, DEFAULT_TIMEOUT_MS),
      fetchImpl: config.fetchImpl ?? defaultFetch()
    };
    this.attachLifecycleFlush();
  }

  async identify(input: IdentifyInput): Promise<void> {
    this.resolveCache.clear();
    await this.request<void>("/sdk/identify", toIdentifyPayload(input)).catch((error) => {
      warn("identify failed open.", error);
    });
  }

  async track(events: InteractionEvent[] | TrackInput): Promise<void> {
    const input = Array.isArray(events) ? { events } : events;
    this.eventQueue.push(...toEventsPayload(input).events);
    if (this.eventQueue.length >= this.config.maxBatchSize) {
      await this.flush(input).catch((error) => {
        warn("event flush failed open.", error);
      });
      return;
    }
    this.scheduleFlush(input);
  }

  async resolve(input: ResolveInput): Promise<AdaptationDecision> {
    const cacheKey = this.resolveCacheKey(input);
    const cached = this.resolveCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.decision;
    }

    const decision = await this.request<unknown>("/sdk/resolve", input)
      .then((payload) => parseDecision(payload, input))
      .catch((error) => {
        warn("resolve failed open.", error);
        return fallbackDecision(input);
      });

    this.resolveCache.set(cacheKey, { decision, expiresAt: Date.now() + RESOLVE_CACHE_TTL_MS });
    return decision;
  }

  async resolveBatch(input: BatchResolveInput): Promise<BatchAdaptationDecision> {
    return this.request<unknown>("/sdk/resolve/batch", input)
      .then((payload) => parseBatchDecision(payload, input))
      .catch((error) => {
        warn("batch resolve failed open.", error);
        return fallbackBatchDecision(input);
      });
  }

  async flush(identity: Omit<TrackInput, "events"> = {}): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.eventQueue.length === 0) {
      return;
    }
    const events = this.eventQueue.splice(0, this.eventQueue.length);
    const payload = toEventsPayload({ ...identity, events });
    await this.request<void>("/sdk/events", payload).catch((error) => {
      this.eventQueue.unshift(...events);
      throw error;
    });
  }

  private async request<T>(path: string, payload: unknown): Promise<T> {
    const response = await this.fetchWithRetry(path, payload);
    if (!response.ok) {
      throw new PollexClientError(`Pollex API returned ${response.status}.`);
    }
    return (await parseJson(response)) as T;
  }

  private async fetchWithRetry(path: string, payload: unknown): Promise<Response> {
    try {
      return await this.fetchOnce(path, payload);
    } catch (error) {
      return await this.fetchOnce(path, payload).catch((retryError) => {
        throw retryError instanceof Error ? retryError : error;
      });
    }
  }

  private async fetchOnce(path: string, payload: unknown): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      return await this.config.fetchImpl(`${this.config.apiBaseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private scheduleFlush(identity: Omit<TrackInput, "events">): void {
    if (this.flushTimer) {
      return;
    }
    this.flushTimer = setTimeout(() => {
      void this.flush(identity).catch((error) => {
        warn("scheduled event flush failed open.", error);
      });
    }, this.config.flushIntervalMs);
  }

  private attachLifecycleFlush(): void {
    if (this.lifecycleAttached || typeof window === "undefined") {
      return;
    }
    window.addEventListener("pagehide", () => this.flushWithBeacon());
    this.lifecycleAttached = true;
  }

  private flushWithBeacon(): void {
    if (this.eventQueue.length === 0 || typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
      return;
    }
    const events = this.eventQueue.splice(0, this.eventQueue.length);
    const blob = new Blob([JSON.stringify({ events })], { type: "application/json" });
    const sent = navigator.sendBeacon(`${this.config.apiBaseUrl}/sdk/events`, blob);
    if (!sent) {
      this.eventQueue.unshift(...events);
    }
  }

  private resolveCacheKey(input: ResolveInput): string {
    return [input.element.key, input.subject_id ?? "", input.anonymous_id ?? ""].join("::");
  }
}

function positiveInt(value: number | undefined, fallback: number): number {
  return value && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function defaultFetch(): FetchLike {
  if (typeof fetch !== "function") {
    throw new PollexClientError("No fetch implementation is available.");
  }
  return fetch;
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
