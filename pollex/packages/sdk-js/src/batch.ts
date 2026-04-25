import type { BatchAdaptationDecision, BatchResolveInput } from "./types";
import { fallbackDecision } from "./errors";

export function fallbackBatchDecision(input: BatchResolveInput): BatchAdaptationDecision {
  return {
    decisions: input.elements.map((element) => fallbackDecision({ element }))
  };
}
