export type JsonValue = unknown;
export type JsonRecord = Record<string, unknown>;

export interface PollexConfig {
  apiKey: string;
  apiBaseUrl: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  timeoutMs?: number;
}

export interface IdentifyInput {
  subject_id?: string;
  anonymous_id?: string;
  traits?: JsonRecord;
}

export interface InteractionEvent {
  element_key: string;
  event_type: "missed_tap" | "hesitation" | "rage_tap" | "form_error" | "backtrack" | "conversion" | "element_seen" | "click" | "dismiss" | string;
  event_value?: JsonRecord;
  context?: JsonRecord;
  occurred_at?: string;
}

export interface TrackInput {
  subject_id?: string;
  anonymous_id?: string;
  session_id?: string;
  events: InteractionEvent[];
}

export interface AllowConfig {
  text?: boolean;
  size?: boolean;
  tooltip?: boolean;
  helper_text?: boolean;
  icon?: boolean;
  color?: boolean;
  position?: boolean;
  layout?: boolean;
}

export interface ConstraintConfig {
  maxTextLength?: number;
  tone?: "clear" | string;
  emoji?: boolean;
  [key: string]: unknown;
}

export interface ContextConfig {
  page_type?: string;
  sensitive?: boolean;
  [key: string]: unknown;
}

export interface ResolveElement {
  key: string;
  type: "button" | "text" | "input" | string;
  intent?: string;
  default_props?: JsonRecord;
}

export interface ResolveInput {
  subject_id?: string;
  anonymous_id?: string;
  session_id?: string;
  element: ResolveElement;
  allow: AllowConfig;
  constraints?: ConstraintConfig;
  context?: ContextConfig;
  traits?: JsonRecord;
}

export interface BatchResolveInput {
  subject_id?: string;
  anonymous_id?: string;
  session_id?: string;
  elements: ResolveElement[];
  allow: AllowConfig;
  constraints?: ConstraintConfig;
  context?: ContextConfig;
  traits?: JsonRecord;
}

export interface AdaptationDecision {
  element_key: string;
  adaptations: JsonRecord;
  confidence: number;
  reason: string;
  policy_passed: boolean;
  fallback: boolean;
  mode: string;
}

export interface BatchAdaptationDecision {
  decisions: AdaptationDecision[];
}

export interface ElementConfig {
  id: string;
  type: "button" | "text" | "input" | string;
  intent: string;
  defaultProps: Record<string, unknown>;
  allow: AllowConfig;
  constraints?: ConstraintConfig;
  context?: ContextConfig;
}
