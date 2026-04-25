import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTactusDecision } from "../src";
import { makeClient, makeDecision, wrapper } from "./test-utils";

function config() {
  return {
    id: "checkout.continue",
    type: "button",
    intent: "progress",
    defaultProps: { text: "Continue" },
    allow: { text: true }
  };
}

describe("useTactusDecision", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("test_returns_loading_true_initially", () => {
    const client = makeClient({ resolve: vi.fn(() => new Promise<never>(() => undefined)) });
    const hookWrapper = ({ children }: { children: ReactNode }) => wrapper(client, children);

    const result = renderHook(() => useTactusDecision(config()), { wrapper: hookWrapper });

    expect(result.result.current.isLoading).toBe(true);
    expect(result.result.current.adaptations).toEqual({ text: "Continue" });
  });

  it("test_returns_adaptations_after_resolve", async () => {
    const client = makeClient({ resolve: vi.fn().mockResolvedValue(makeDecision({ adaptations: { text: "Next step" } })) });
    const hookWrapper = ({ children }: { children: ReactNode }) => wrapper(client, children);

    const result = renderHook(() => useTactusDecision(config()), { wrapper: hookWrapper });

    await waitFor(() => expect(result.result.current.adaptations).toEqual({ text: "Next step" }));
    expect(result.result.current.isAdapted).toBe(true);
  });

  it("test_returns_fallback_on_client_error", async () => {
    const client = makeClient({ resolve: vi.fn().mockRejectedValue(new Error("down")) });
    const hookWrapper = ({ children }: { children: ReactNode }) => wrapper(client, children);

    const result = renderHook(() => useTactusDecision(config()), { wrapper: hookWrapper });

    await waitFor(() => expect(result.result.current.isFallback).toBe(true));
    expect(result.result.current.adaptations).toEqual({ text: "Continue" });
  });

  it("test_does_not_re_resolve_on_rerender", async () => {
    const client = makeClient({ resolve: vi.fn().mockResolvedValue(makeDecision()) });
    const hookWrapper = ({ children }: { children: ReactNode }) => wrapper(client, children);

    const result = renderHook(() => useTactusDecision(config()), { wrapper: hookWrapper });
    await waitFor(() => expect(result.result.current.isLoading).toBe(false));
    result.rerender();

    expect(client.resolve).toHaveBeenCalledTimes(1);
  });
});
