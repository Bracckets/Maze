import type { AdaptationDecision, ResolveInput } from "./types";

export class PollexClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PollexClientError";
  }
}

export function warn(message: string, error?: unknown): void {
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(`[Pollex] ${message}`, error ?? "");
  }
}

export function fallbackDecision(input: Pick<ResolveInput, "element">, reason = "Fallback rendered."): AdaptationDecision {
  return {
    element_key: input.element.key,
    adaptations: {},
    confidence: 0,
    reason,
    policy_passed: true,
    fallback: true,
    mode: "observe"
  };
}
