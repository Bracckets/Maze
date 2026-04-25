import type { ReactNode } from "react";
import { vi } from "vitest";

import type { PollexClient } from "@pollex/sdk-js";

import { PollexContext } from "../src/PollexProvider";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export function makeDecision(overrides: Record<string, unknown> = {}) {
  return {
    element_key: "checkout.continue",
    adaptations: { text: "Next step" },
    confidence: 0.75,
    reason: "Resolved.",
    policy_passed: true,
    fallback: false,
    mode: "autopilot",
    ...overrides
  };
}

export function makeClient(overrides: Partial<PollexClient> = {}) {
  return {
    identify: vi.fn().mockResolvedValue(undefined),
    track: vi.fn().mockResolvedValue(undefined),
    resolve: vi.fn().mockResolvedValue(makeDecision()),
    resolveBatch: vi.fn().mockResolvedValue({ decisions: [] }),
    ...overrides
  } as unknown as PollexClient;
}

export function wrapper(client: PollexClient, children?: ReactNode) {
  return (
    <PollexContext.Provider value={{ client, userId: "user_123", anonymousId: "anon_abc", traits: {}, debug: false }}>
      {children}
    </PollexContext.Provider>
  );
}
