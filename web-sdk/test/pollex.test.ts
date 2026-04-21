import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PollexClient } from "../src/client";
import type { PollexLiquidBundle } from "../src/types";

const html2CanvasMock = vi.fn(async () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 800;
  canvas.toBlob = ((callback: BlobCallback) => callback(new Blob(["capture"], { type: "image/jpeg" }))) as typeof canvas.toBlob;
  return canvas;
});

vi.mock("html2canvas", () => ({
  default: html2CanvasMock,
}));

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function makeBundle(overrides: Partial<PollexLiquidBundle> = {}): PollexLiquidBundle {
  return {
    screenKey: "checkout_paywall",
    stage: "published",
    revision: 1,
    etag: "etag-1",
    ttlSeconds: 60,
    generatedAt: new Date().toISOString(),
    items: [
      {
        key: "checkout_paywall.primary_cta",
        text: "Continue",
        visibility: "visible",
        emphasis: "high",
        ordering: 0,
        locale: "en-US",
        source: "default",
      },
    ],
    diagnostics: {
      resolvedTraits: [],
      missingTraits: [],
      traitSources: {},
      matchedProfileCount: 0,
      fallbackItemCount: 0,
    },
    ...overrides,
  };
}

describe("Pollex web SDK", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    Object.defineProperty(window, "innerWidth", { value: 100, configurable: true, writable: true });
    Object.defineProperty(window, "innerHeight", { value: 50, configurable: true, writable: true });
    Object.defineProperty(window, "devicePixelRatio", { value: 1, configurable: true, writable: true });
    Object.defineProperty(window, "scrollX", { value: 0, configurable: true, writable: true });
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
    Object.defineProperty(document.documentElement, "scrollWidth", { value: 100, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 50, configurable: true });
    Object.defineProperty(document.documentElement, "clientWidth", { value: 100, configurable: true });
    Object.defineProperty(document.documentElement, "clientHeight", { value: 50, configurable: true });
    Object.defineProperty(document.body, "scrollWidth", { value: 100, configurable: true });
    Object.defineProperty(document.body, "scrollHeight", { value: 50, configurable: true });
    Object.defineProperty(document.body, "clientWidth", { value: 100, configurable: true });
    Object.defineProperty(document.body, "clientHeight", { value: 50, configurable: true });
    html2CanvasMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires configure before tracking", () => {
    const client = new PollexClient();
    expect(() => client.track("tap")).toThrow("Call Pollex.configure(...)");
  });

  it("flushes queued events on the configured interval", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ accepted: 1 }));
    const client = new PollexClient();

    client.configure({
      apiKey: "mz_live_test",
      fetchImpl: fetchMock,
      flushIntervalMs: 50,
      batchSize: 10,
      storagePrefix: "interval-test",
    });

    client.track("tap");
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("flushes immediately when the batch size is reached", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ accepted: 2 }));
    const client = new PollexClient();

    client.configure({
      apiKey: "mz_live_test",
      fetchImpl: fetchMock,
      batchSize: 2,
      storagePrefix: "batch-test",
    });

    client.track("tap");
    client.track("tap");
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries failed event uploads after the backoff delay", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "nope" }, { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ accepted: 1 }));
    const client = new PollexClient();

    client.configure({
      apiKey: "mz_live_test",
      fetchImpl: fetchMock,
      batchSize: 1,
      storagePrefix: "retry-test",
    });

    client.track("tap");
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("derives the Liquid endpoint from the events endpoint and sends platform web", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(makeBundle()));
    const client = new PollexClient();

    client.configure({
      apiKey: "mz_live_test",
      endpoint: "https://api.example.com/events",
      fetchImpl: fetchMock,
      storagePrefix: "liquid-derive",
    });

    await client.resolveLiquidBundle({ screen: "checkout_paywall", traits: { "user.plan": "growth" } });

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/liquid/runtime/bundles/resolve");
    expect(JSON.parse(String(request.body))).toMatchObject({
      screenKey: "checkout_paywall",
      platform: "web",
      traits: { "user.plan": "growth" },
    });
  });

  it("persists the generated device and session identifiers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ accepted: 1 }));
    const firstClient = new PollexClient();

    firstClient.configure({
      apiKey: "mz_live_test",
      fetchImpl: fetchMock,
      batchSize: 1,
      storagePrefix: "persisted",
    });

    const deviceId = window.localStorage.getItem("persisted_device_id");
    const sessionId = window.sessionStorage.getItem("persisted_session_id");

    expect(deviceId).toBeTruthy();
    expect(sessionId).toBeTruthy();

    const secondClient = new PollexClient();
    secondClient.configure({
      apiKey: "mz_live_test",
      fetchImpl: fetchMock,
      batchSize: 1,
      storagePrefix: "persisted",
    });
    secondClient.track("tap");
    await Promise.resolve();

    const latestCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit];
    const [, request] = latestCall;
    const payload = JSON.parse(String(request.body));
    expect(payload.events[0].device_id).toBe(deviceId);
    expect(payload.events[0].session_id).toBe(sessionId);
    expect(payload.events[0].platform).toBe("web");
  });

  it("falls back to in-memory identifiers when storage is unavailable", async () => {
    const originalLocalStorage = window.localStorage;
    const originalSessionStorage = window.sessionStorage;
    try {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: {
          getItem() {
            throw new Error("blocked");
          },
          setItem() {
            throw new Error("blocked");
          },
          removeItem() {
            throw new Error("blocked");
          },
        },
      });
      Object.defineProperty(window, "sessionStorage", {
        configurable: true,
        value: {
          getItem() {
            throw new Error("blocked");
          },
          setItem() {
            throw new Error("blocked");
          },
          removeItem() {
            throw new Error("blocked");
          },
        },
      });

      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ accepted: 1 }));
      const client = new PollexClient();
      client.configure({
        apiKey: "mz_live_test",
        fetchImpl: fetchMock,
        batchSize: 1,
        storagePrefix: "memory-fallback",
      });

      client.track("tap");
      await Promise.resolve();

      const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
      const payload = JSON.parse(String(request.body));
      expect(payload.events[0].device_id).toBeTruthy();
      expect(payload.events[0].session_id).toBeTruthy();
    } finally {
      Object.defineProperty(window, "localStorage", { configurable: true, value: originalLocalStorage });
      Object.defineProperty(window, "sessionStorage", { configurable: true, value: originalSessionStorage });
    }
  });

  it("masks long metadata values and records page-relative coordinates", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ accepted: 1 }));
    const client = new PollexClient();
    Object.defineProperty(window, "scrollX", { value: 20, configurable: true, writable: true });
    Object.defineProperty(window, "scrollY", { value: 400, configurable: true, writable: true });
    Object.defineProperty(document.documentElement, "scrollWidth", { value: 300, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(document.body, "scrollWidth", { value: 300, configurable: true });
    Object.defineProperty(document.body, "scrollHeight", { value: 1000, configurable: true });
    client.configure({
      apiKey: "mz_live_test",
      fetchImpl: fetchMock,
      batchSize: 1,
      storagePrefix: "metadata-test",
      appVersion: "1.2.3",
    });

    client.track("tap", {
      screen: "checkout_paywall",
      elementId: "primary_cta",
      x: 50,
      y: 25,
      metadata: {
        short: "ok",
        long: "abcdefghijklmnopqrstuvwxyz",
      },
    });
    await Promise.resolve();

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const event = JSON.parse(String(request.body)).events[0];
    expect(event.metadata).toEqual({
      short: "ok",
      long: "***",
      __pollex_page_x: "0.233333",
      __pollex_page_y: "0.425000",
    });
    expect(event.x).toBe(0.5);
    expect(event.y).toBe(0.5);
    expect(event.screen_width).toBe(100);
    expect(event.screen_height).toBe(50);
    expect(event.app_version).toBe("1.2.3");
    expect(event.platform).toBe("web");
  });

  it("emits a screen_view event from screen()", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ accepted: 1 }));
    const client = new PollexClient();
    client.configure({
      apiKey: "mz_live_test",
      fetchImpl: fetchMock,
      batchSize: 1,
      storagePrefix: "screen-test",
    });

    client.screen("dashboard");
    await Promise.resolve();

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const event = JSON.parse(String(request.body)).events[0];
    expect(event.event).toBe("screen_view");
    expect(event.screen).toBe("dashboard");
  });

  it("uploads a screenshot for screen_view when session capture is enabled", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ screenshot_id: "shot-123" }))
      .mockResolvedValueOnce(jsonResponse({ accepted: 1 }));
    const client = new PollexClient();
    Object.defineProperty(document.documentElement, "scrollWidth", { value: 375, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 1200, configurable: true });
    Object.defineProperty(document.body, "scrollWidth", { value: 375, configurable: true });
    Object.defineProperty(document.body, "scrollHeight", { value: 1200, configurable: true });

    client.configure({
      apiKey: "mz_live_test",
      endpoint: "http://127.0.0.1:8000/events",
      fetchImpl: fetchMock,
      batchSize: 1,
      storagePrefix: "capture-test",
      sessionCaptureEnabled: true,
      captureBlockedScreens: [],
    });

    client.screen("dashboard");
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(html2CanvasMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, html2CanvasOptions] = html2CanvasMock.mock.calls[0] as unknown as [Element, Record<string, unknown>];
    expect(html2CanvasOptions).toMatchObject({
      width: 375,
      height: 1200,
      windowWidth: 375,
      windowHeight: 1200,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
    });

    const [screenshotUrl, screenshotRequest] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(screenshotUrl).toBe("http://127.0.0.1:8000/screenshots");
    expect(screenshotRequest.body).toBeInstanceOf(FormData);

    const [, eventRequest] = fetchMock.mock.calls[1] as [string, RequestInit];
    const event = JSON.parse(String(eventRequest.body)).events[0];
    expect(event.event).toBe("screen_view");
    expect(event.screenshot_id).toBe("shot-123");
    expect(event.platform).toBe("web");
  });

  it("uses cache hits, expires cached Liquid bundles, and clears the Liquid cache", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(makeBundle({ ttlSeconds: 1, etag: "etag-1" })))
      .mockResolvedValueOnce(jsonResponse(makeBundle({ ttlSeconds: 1, etag: "etag-2" })))
      .mockResolvedValueOnce(jsonResponse(makeBundle({ ttlSeconds: 1, etag: "etag-3" })));
    const client = new PollexClient();
    client.configure({
      apiKey: "mz_live_test",
      fetchImpl: fetchMock,
      storagePrefix: "cache-test",
    });

    const first = await client.resolveLiquidBundle({ screen: "checkout_paywall" });
    const second = await client.resolveLiquidBundle({ screen: "checkout_paywall" });
    expect(first.etag).toBe("etag-1");
    expect(second.etag).toBe("etag-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_001);
    const third = await client.resolveLiquidBundle({ screen: "checkout_paywall" });
    expect(third.etag).toBe("etag-2");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    client.clearLiquidCache();
    const fourth = await client.resolveLiquidBundle({ screen: "checkout_paywall" });
    expect(fourth.etag).toBe("etag-3");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("attempts a keepalive flush on pagehide", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ accepted: 1 }));
    const client = new PollexClient();

    client.configure({
      apiKey: "mz_live_test",
      fetchImpl: fetchMock,
      flushIntervalMs: 10_000,
      batchSize: 10,
      storagePrefix: "pagehide-test",
    });

    client.track("tap");
    window.dispatchEvent(new Event("pagehide"));
    await Promise.resolve();

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(request.keepalive).toBe(true);
  });
});
