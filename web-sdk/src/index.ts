export { PollexClient, PollexClientError } from "./client";
export type {
  PollexConfig,
  PollexEventPayload,
  PollexFetch,
  PollexLiquidBundle,
  PollexLiquidDiagnostics,
  PollexLiquidExperimentAssignment,
  PollexLiquidResolveOptions,
  PollexLiquidResolvedItem,
  PollexLiquidResolvedTrait,
  PollexTrackOptions,
} from "./types";

import { PollexClient } from "./client";

export const Pollex = new PollexClient();
