import type { IdentifyInput } from "./types";

export function toIdentifyPayload(input: IdentifyInput): IdentifyInput {
  return {
    subject_id: input.subject_id,
    anonymous_id: input.anonymous_id,
    traits: input.traits ?? {}
  };
}
