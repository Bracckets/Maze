import type {
  AdaptationDecision,
  BatchAdaptationDecision,
  BatchResolveInput,
  IdentifyInput,
  InteractionEvent,
  ResolveInput
} from "@pollex/sdk-js";

import type { Persona } from "./personas";

export type DecisionObserver = (decision: AdaptationDecision) => void;

export class DemoPollexClient {
  constructor(
    private readonly getPersona: () => Persona,
    private readonly observe: DecisionObserver
  ) {}

  async identify(_input: IdentifyInput): Promise<void> {
    return Promise.resolve();
  }

  async track(_events: InteractionEvent[] | { events: InteractionEvent[] }): Promise<void> {
    return Promise.resolve();
  }

  async resolve(input: ResolveInput): Promise<AdaptationDecision> {
    const persona = this.getPersona();
    const decision = decide(persona, input);
    this.observe(decision);
    return decision;
  }

  async resolveBatch(input: BatchResolveInput): Promise<BatchAdaptationDecision> {
    return { decisions: await Promise.all(input.elements.map((element) => this.resolve({ ...input, element }))) };
  }
}

function decide(persona: Persona, input: ResolveInput): AdaptationDecision {
  const adaptations: Record<string, unknown> = {};
  const elementKey = input.element.key;
  let reason = "Fallback rendered.";
  let fallback = true;

  if (persona.id === "hesitant") {
    if (input.allow.text && input.element.intent === "progress") {
      adaptations.text = "Next step";
      reason = "User hesitated, so Tactus simplified the CTA.";
    }
    if (input.allow.tooltip) {
      adaptations.tooltip = "You can review before paying.";
      reason = "User hesitated, so Tactus added guidance.";
    }
  }

  if (persona.id === "missed-tap" && input.allow.size) {
    adaptations.size = "lg";
    reason = "User missed the tap target multiple times.";
  }

  if (persona.id === "arabic" && input.allow.text) {
    adaptations.text = input.element.intent === "submit" ? "إرسال" : "التالي";
    reason = "User locale indicates Arabic copy is preferred.";
  }

  if (persona.id === "high-friction" && input.allow.tooltip) {
    adaptations.tooltip = "You can continue safely when you are ready.";
    reason = "User showed repeated friction; Tactus added reassurance.";
  }

  if (Object.keys(adaptations).length > 0) {
    fallback = false;
  }

  return {
    element_key: elementKey,
    adaptations,
    confidence: fallback ? 0 : 0.78,
    reason,
    policy_passed: true,
    fallback,
    mode: "autopilot"
  };
}
