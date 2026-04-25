import { z } from "zod";

import type { AdaptationDecision, BatchAdaptationDecision, BatchResolveInput, JsonRecord, ResolveInput } from "./types";
import { fallbackDecision } from "./errors";

export const adaptationDecisionSchema = z.object({
  element_key: z.string(),
  adaptations: z.record(z.unknown()).default({}),
  confidence: z.number().catch(0),
  reason: z.string().catch("Fallback rendered."),
  policy_passed: z.boolean().catch(true),
  fallback: z.boolean().catch(true),
  mode: z.string().catch("observe")
});

export const batchAdaptationDecisionSchema = z.object({
  decisions: z.array(adaptationDecisionSchema)
});

export function parseDecision(payload: unknown, input: ResolveInput): AdaptationDecision {
  const parsed = adaptationDecisionSchema.safeParse(payload);
  return parsed.success ? sanitizeDecision(parsed.data) : fallbackDecision(input, "Fallback rendered.");
}

export function parseBatchDecision(payload: unknown, input: BatchResolveInput): BatchAdaptationDecision {
  const parsed = batchAdaptationDecisionSchema.safeParse(payload);
  if (parsed.success) {
    return { decisions: parsed.data.decisions.map(sanitizeDecision) };
  }
  return {
    decisions: input.elements.map((element) => fallbackDecision({ element }, "Fallback rendered."))
  };
}

function sanitizeDecision(decision: AdaptationDecision): AdaptationDecision {
  return {
    ...decision,
    adaptations: stripUnsafeAdaptations(decision.adaptations)
  };
}

function stripUnsafeAdaptations(adaptations: JsonRecord): JsonRecord {
  const clean: JsonRecord = {};
  for (const [key, value] of Object.entries(adaptations)) {
    if (key === "color" || key === "position" || key === "layout") {
      continue;
    }
    if (typeof value === "string" && (looksLikeHtml(value) || looksLikeCss(value))) {
      continue;
    }
    clean[key] = value;
  }
  return clean;
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[A-Za-z][^>]*>/.test(value);
}

function looksLikeCss(value: string): boolean {
  return /[A-Za-z-]+\s*:\s*[^;]+;/.test(value) || /{\s*[^}]+:\s*[^}]+}/.test(value);
}
