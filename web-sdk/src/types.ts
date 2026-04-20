export type PollexFetch = typeof fetch;

export type PollexConfig = {
  apiKey: string;
  endpoint?: string;
  screenshotEndpoint?: string;
  liquidEndpoint?: string;
  appVersion?: string;
  deviceId?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  liquidCacheTTLSeconds?: number;
  storagePrefix?: string;
  sessionCaptureEnabled?: boolean;
  screenshotQuality?: number;
  screenshotMaxDimension?: number;
  captureAllowedScreens?: string[];
  captureBlockedScreens?: string[];
  captureEvaluator?: (screen: string | null) => boolean;
  fetchImpl?: PollexFetch;
};

export type PollexTrackOptions = {
  screen?: string;
  elementId?: string;
  metadata?: Record<string, string>;
  x?: number;
  y?: number;
};

export type PollexLiquidResolveOptions = {
  screen: string;
  locale?: string;
  subjectId?: string;
  country?: string;
  traits?: Record<string, string>;
};

export type PollexLiquidExperimentAssignment = {
  experimentKey: string;
  arm: string;
};

export type PollexLiquidResolvedItem = {
  key: string;
  text: string;
  icon?: string | null;
  visibility: "visible" | "hidden";
  emphasis: "low" | "medium" | "high";
  ordering: number;
  locale: string;
  source: "experiment" | "rule" | "segment" | "default" | "safe_fallback";
  matchedVariantId?: string | null;
  matchedProfileId?: string | null;
  matchedProfileKey?: string | null;
  fallbackReason?: string | null;
  experiment?: PollexLiquidExperimentAssignment | null;
};

export type PollexLiquidResolvedTrait = {
  traitKey: string;
  value: unknown;
  sourceType: "app_profile" | "maze_computed" | "manual_test";
  sourceKey?: string | null;
  present: boolean;
  liveEligible: boolean;
};

export type PollexLiquidDiagnostics = {
  resolvedTraits: PollexLiquidResolvedTrait[];
  missingTraits: string[];
  traitSources: Record<string, string>;
  matchedProfileCount: number;
  fallbackItemCount: number;
};

export type PollexLiquidBundle = {
  screenKey: string;
  stage: "draft" | "published";
  revision: number;
  etag: string;
  ttlSeconds: number;
  generatedAt: string;
  items: PollexLiquidResolvedItem[];
  diagnostics: PollexLiquidDiagnostics;
};

export type PollexEventPayload = {
  event_id: string;
  session_id: string;
  device_id: string;
  occurred_at: string;
  event: string;
  screen: string | null;
  element_id: string | null;
  x: number | null;
  y: number | null;
  screen_width: number | null;
  screen_height: number | null;
  app_version: string | null;
  screenshot_id?: string | null;
  platform: "web";
  metadata: Record<string, string>;
};
