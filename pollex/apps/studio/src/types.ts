export type JsonRecord = Record<string, unknown>;

export interface Overview {
  total_observed_elements: number;
  active_profiles_7d: number;
  decisions_24h: number;
  decisions_7d: number;
  fallback_rate: number;
  policy_blocked_count: number;
  top_traits: Array<{ trait: string; count: number }>;
  decisions_over_time: Array<{ date: string; count: number }>;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface ElementRow {
  id: string;
  element_key: string;
  type: string;
  intent?: string;
  default_props: JsonRecord;
  metadata: JsonRecord;
  first_seen_at?: string;
  last_seen_at?: string;
  mode?: string;
  recent_decisions?: number;
}

export interface Profile {
  id: string;
  subject_id: string;
  anonymous_id?: string;
  traits: JsonRecord;
  scores: JsonRecord;
  counters: JsonRecord;
  preferences: JsonRecord;
  last_seen_at?: string;
  updated_at?: string;
  decision_count?: number;
}

export interface Decision {
  id: string;
  subject_id?: string;
  element_key: string;
  decision: JsonRecord;
  blocked: Array<{ field: string; reason: string }>;
  reason?: string;
  policy_passed: boolean;
  fallback: boolean;
  mode: string;
  created_at?: string;
}

export interface Policy {
  id: string;
  scope: string;
  mode: "observe" | "suggest" | "autopilot";
  element_key?: string;
  allowed_adaptations: Record<string, boolean>;
  blocked_adaptations: Record<string, boolean>;
  risk_policy: Record<string, boolean>;
  sensitive_context_rules: Record<string, boolean>;
  updated_at?: string;
}

export interface DesignSystem {
  id: string;
  name: string;
  version: number;
  tokens: JsonRecord;
  component_contracts: JsonRecord;
  brand_voice: JsonRecord;
}

export interface PlaygroundPreset {
  id: string;
  name: string;
  expected: string;
  profile: JsonRecord;
  policy: Policy;
  element: { key: string; type: string; intent: string; default_props: JsonRecord };
  context: JsonRecord;
}

export interface PlaygroundTrace {
  profile_used: JsonRecord;
  proposal: JsonRecord | null;
  validation_result: JsonRecord;
  final_decision: {
    element_key: string;
    adaptations: JsonRecord;
    confidence: number;
    reason: string;
    policy_passed: boolean;
    fallback: boolean;
    mode: string;
  };
  rendered_preview: JsonRecord;
}
