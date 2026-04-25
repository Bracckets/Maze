export type {
  AdaptationDecision,
  AllowConfig,
  BatchAdaptationDecision,
  BatchResolveInput,
  ConstraintConfig,
  ContextConfig,
  ElementConfig,
  IdentifyInput,
  InteractionEvent,
  JsonRecord,
  PollexConfig,
  ResolveElement,
  ResolveInput,
  TrackInput
} from "@pollex/shared-types";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface ResolvedPollexConfig {
  apiKey: string;
  apiBaseUrl: string;
  flushIntervalMs: number;
  maxBatchSize: number;
  timeoutMs: number;
  fetchImpl: FetchLike;
}
