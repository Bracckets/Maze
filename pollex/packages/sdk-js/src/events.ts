import type { InteractionEvent, TrackInput } from "./types";

export function normalizeEvents(events: InteractionEvent[]): InteractionEvent[] {
  return events.map((event) => ({
    element_key: event.element_key,
    event_type: event.event_type,
    event_value: event.event_value ?? {},
    context: event.context ?? {},
    occurred_at: event.occurred_at ?? new Date().toISOString()
  }));
}

export function toEventsPayload(input: TrackInput): TrackInput {
  return {
    subject_id: input.subject_id,
    anonymous_id: input.anonymous_id,
    session_id: input.session_id,
    events: normalizeEvents(input.events)
  };
}
