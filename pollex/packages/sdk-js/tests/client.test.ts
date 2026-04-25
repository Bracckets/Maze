import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PollexClient } from "../src";
import type { AdaptationDecision, BatchAdaptationDecision, ResolveInput } from "../src";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function resolveInput(overrides: Partial<ResolveInput> = {}): ResolveInput {
  return {
    subject_id: "user_123",
    element: {
      key: "checkout.continue",
      type: "button",
      intent: "progress",
      default_props: { text: "Continue" }
    },
    allow: { text: true, size: true, tooltip: true },
    constraints: { maxTextLength: 24, emoji: false },
    context: { page_type: "checkout", sensitive: false },
    ...overrides
  };
}

function decision(overrides: Partial<AdaptationDecision> = {}): AdaptationDecision {
  return {
    element_key: "checkout.continue",
    adaptations: { text: "Next step" },
    confidence: 0.75,
    reason: "User hesitated.",
    policy_passed: true,
    fallback: false,
    mode: "autopilot",
    ...overrides
  };
}

describe("PollexClient", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("test_identify_calls_backend", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));
    const client = new PollexClient({ apiKey: "px_test", apiBaseUrl: "http://localhost:8000", fetchImpl });

    await client.identify({ subject_id: "user_123", traits: { locale: "en" } });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:8000/sdk/identify",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer px_test" }),
        body: JSON.stringify({ subject_id: "user_123", traits: { locale: "en" } })
      })
    );
  });

  it("test_track_batches_events", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ accepted: 2 }));
    const client = new PollexClient({
      apiKey: "px_test",
      apiBaseUrl: "http://localhost:8000",
      fetchImpl,
      maxBatchSize: 2
    });

    await client.track([{ element_key: "a", event_type: "click" }]);
    expect(fetchImpl).not.toHaveBeenCalled();
    await client.track([{ element_key: "b", event_type: "missed_tap" }]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(payload.events).toHaveLength(2);
    expect(payload.events[0].occurred_at).toBeTruthy();
  });

  it("test_resolve_returns_adaptations", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(decision()));
    const client = new PollexClient({ apiKey: "px_test", apiBaseUrl: "http://localhost:8000", fetchImpl });

    await expect(client.resolve(resolveInput())).resolves.toMatchObject({
      adaptations: { text: "Next step" },
      fallback: false
    });
  });

  it("test_resolve_returns_fallback_on_api_error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ detail: "down" }, 500));
    const client = new PollexClient({ apiKey: "px_test", apiBaseUrl: "http://localhost:8000", fetchImpl });

    await expect(client.resolve(resolveInput())).resolves.toMatchObject({
      adaptations: {},
      fallback: true,
      mode: "observe"
    });
  });

  it("test_resolve_returns_fallback_on_timeout", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    });
    const client = new PollexClient({
      apiKey: "px_test",
      apiBaseUrl: "http://localhost:8000",
      fetchImpl,
      timeoutMs: 10
    });

    const result = client.resolve(resolveInput());
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(10);

    await expect(result).resolves.toMatchObject({ fallback: true, adaptations: {} });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("test_resolve_cache_hit_skips_api_call", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(decision()));
    const client = new PollexClient({ apiKey: "px_test", apiBaseUrl: "http://localhost:8000", fetchImpl });

    await client.resolve(resolveInput());
    await client.resolve(resolveInput());

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("test_identify_clears_resolve_cache", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(decision({ adaptations: { text: "First" } })))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse(decision({ adaptations: { text: "Second" } })));
    const client = new PollexClient({ apiKey: "px_test", apiBaseUrl: "http://localhost:8000", fetchImpl });

    await expect(client.resolve(resolveInput())).resolves.toMatchObject({ adaptations: { text: "First" } });
    await client.identify({ subject_id: "user_123" });
    await expect(client.resolve(resolveInput())).resolves.toMatchObject({ adaptations: { text: "Second" } });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("test_batch_resolve_returns_all_decisions", async () => {
    const batch: BatchAdaptationDecision = {
      decisions: [
        decision({ element_key: "checkout.continue" }),
        decision({ element_key: "checkout.submit", adaptations: { size: "lg" } })
      ]
    };
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(batch));
    const client = new PollexClient({ apiKey: "px_test", apiBaseUrl: "http://localhost:8000", fetchImpl });

    await expect(
      client.resolveBatch({
        subject_id: "user_123",
        elements: [
          { key: "checkout.continue", type: "button", intent: "progress" },
          { key: "checkout.submit", type: "button", intent: "submit" }
        ],
        allow: { text: true, size: true }
      })
    ).resolves.toMatchObject(batch);
  });
});
