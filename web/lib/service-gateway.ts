import { cookies } from "next/headers";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type BackendResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

export type IntegrationService = {
  name: string;
  status: string;
  path: string;
};

export type IntegrationStatusResponse = {
  services: IntegrationService[];
};

export type UsageMetric = {
  used: number;
  limit: number | null;
  percent: number | null;
};

export type UsageDailyTrend = {
  date: string;
  events: number;
  sessions: number;
  apiRequests: number;
};

export type UsageResponse = {
  workspaceId: string;
  workspaceName: string;
  planId: string | null;
  planName: string | null;
  monthStart: string;
  monthEnd: string;
  events: UsageMetric;
  sessions: UsageMetric;
  apiRequests: UsageMetric;
  daily: UsageDailyTrend[];
  updatedAt: string;
};

export type ScreenshotRef = {
  screenshot_id: string;
  session_id?: string | null;
  screen?: string | null;
  signed_url: string;
  content_type: string;
  width?: number | null;
  height?: number | null;
  byte_size: number;
  uploaded_at: string;
  expires_at: string;
};

export type CurrentUserPayload = {
  user: {
    id: string;
    email: string;
    workspace_id: string;
    workspace_name: string;
    plan_id?: string | null;
    plan_name?: string | null;
  };
};

export type LiquidContentPayload = {
  text: string;
  icon?: string | null;
  visibility: "visible" | "hidden";
  emphasis: "low" | "medium" | "high";
  ordering: number;
};

export type LiquidCondition = {
  field: string;
  operator: string;
  value: unknown;
};

export type LiquidConditionGroup = {
  all: LiquidCondition[];
  any: LiquidCondition[];
};

export type LiquidVariant = {
  id: string;
  stage: "draft" | "published";
  locale?: string | null;
  content: LiquidContentPayload;
  segmentId?: string | null;
  segmentKey?: string | null;
  ruleId?: string | null;
  ruleKey?: string | null;
  experimentId?: string | null;
  experimentKey?: string | null;
  experimentArm?: string | null;
  trafficPercentage: number;
  priority: number;
  isDefault: boolean;
  enabled: boolean;
  updatedAt: string;
};

export type LiquidKeySummary = {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  namespace?: string | null;
  defaultLocale: string;
  enabled: boolean;
  draftVariantCount: number;
  publishedVariantCount: number;
  bundleCount: number;
  publishedRevision: number;
  publishedAt?: string | null;
  updatedAt: string;
};

export type LiquidKeyDetail = {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  namespace?: string | null;
  defaultLocale: string;
  enabled: boolean;
  publishedRevision: number;
  publishedAt?: string | null;
  draftUpdatedAt: string;
  variants: LiquidVariant[];
  bundles: Array<{
    id: string;
    screenKey: string;
    label: string;
    orderIndex: number;
    enabled: boolean;
  }>;
};

export type LiquidSegment = {
  id: string;
  segmentKey: string;
  name: string;
  description?: string | null;
  conditions: LiquidConditionGroup;
  enabled: boolean;
  updatedAt: string;
};

export type LiquidTraitDefinition = {
  id: string;
  traitKey: string;
  label: string;
  description?: string | null;
  valueType: "text" | "int" | "range" | "boolean" | "select";
  enabled: boolean;
  updatedAt: string;
};

export type LiquidProfileTrait = {
  traitId?: string | null;
  traitKey: string;
  label: string;
  valueType: "text" | "int" | "range" | "boolean" | "select";
  value?: string | null;
  intValue?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  boolValue?: boolean | null;
  displayValue: string;
};

export type LiquidProfile = {
  id: string;
  profileKey: string;
  name: string;
  description?: string | null;
  traits: LiquidProfileTrait[];
  enabled: boolean;
  updatedAt: string;
};

export type LiquidRule = {
  id: string;
  ruleKey: string;
  name: string;
  description?: string | null;
  conditions: LiquidConditionGroup;
  priority: number;
  enabled: boolean;
  updatedAt: string;
};

export type LiquidExperiment = {
  id: string;
  experimentKey: string;
  name: string;
  description?: string | null;
  status: "draft" | "active" | "paused" | "completed";
  trafficAllocation: number;
  seed: string;
  updatedAt: string;
};

export type LiquidBundleSummary = {
  id: string;
  screenKey: string;
  label: string;
  description?: string | null;
  enabled: boolean;
  draftKeyCount: number;
  publishedKeyCount: number;
  publishedRevision: number;
  publishedAt?: string | null;
  updatedAt: string;
};

export type LiquidBundleDetail = {
  id: string;
  screenKey: string;
  label: string;
  description?: string | null;
  enabled: boolean;
  publishedRevision: number;
  publishedAt?: string | null;
  draftItems: Array<{
    keyId: string;
    key: string;
    label: string;
    orderIndex: number;
    enabled: boolean;
  }>;
  publishedItems: Array<{
    keyId: string;
    key: string;
    label: string;
    orderIndex: number;
    enabled: boolean;
  }>;
  updatedAt: string;
};

export type LiquidOverview = {
  keyCount: number;
  bundleCount: number;
  publishedKeyCount: number;
  publishedBundleCount: number;
  segmentCount: number;
  activeExperimentCount: number;
  runtimePath: string;
  cachePolicy: string;
};

export type LiquidBundleResolve = {
  screenKey: string;
  stage: "draft" | "published";
  revision: number;
  etag: string;
  ttlSeconds: number;
  generatedAt: string;
  items: Array<{
    key: string;
    text: string;
    icon?: string | null;
    visibility: "visible" | "hidden";
    emphasis: "low" | "medium" | "high";
    ordering: number;
    locale: string;
    source: "experiment" | "rule" | "segment" | "default" | "safe_fallback";
    experiment?: {
      experimentKey: string;
      arm: string;
    } | null;
  }>;
};

const backendBaseUrl = (process.env.MAZE_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

async function getSessionToken() {
  return (await cookies()).get("maze_session_token")?.value;
}

async function backendRequest<T>(path: string, method: HttpMethod, body?: unknown, token?: string): Promise<BackendResult<T>> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const authToken = token ?? (await getSessionToken());
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  try {
    const response = await fetch(`${backendBaseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const rawBody = await response.text();
    const data = (rawBody ? JSON.parse(rawBody) : {}) as T;
    return { ok: response.ok, status: response.status, data };
  } catch {
    return {
      ok: false,
      status: 503,
      data: { detail: "Maze backend is unavailable right now. Please try again in a moment." } as T,
    };
  }
}

export async function signInWithProvider(payload: { email: string; password: string }) {
  return backendRequest<{ user: { id: string; email: string; workspace_id: string; workspace_name: string; plan_id?: string | null; plan_name?: string | null }; token: string } | { detail?: string }>("/auth/signin", "POST", payload, undefined);
}

export async function signUpWithProvider(payload: { email: string; password: string; workspace_name: string }) {
  return backendRequest<{ user: { id: string; email: string; workspace_id: string; workspace_name: string; plan_id?: string | null; plan_name?: string | null }; token: string } | { detail?: string }>("/auth/signup", "POST", payload, undefined);
}

export async function getCurrentUser() {
  return backendRequest<CurrentUserPayload | { detail?: string }>("/auth/me", "GET");
}

export async function updateCurrentUser(payload: { email: string; workspace_name: string }) {
  return backendRequest<CurrentUserPayload | { detail?: string }>("/auth/me", "PUT", payload);
}

export async function listApiKeys() {
  const result = await backendRequest<{ keys: Array<{ id: string; name: string; prefix?: string; token?: string; createdAt: string; lastUsedAt?: string | null }> } | { detail?: string }>("/workspace/api-keys", "GET");
  return result.data;
}

export async function createApiKey(payload: { name: string; environment: "test" | "live" }) {
  return backendRequest<{ key: { id: string; name: string; prefix?: string; token?: string; createdAt: string; lastUsedAt?: string | null } } | { detail?: string }>("/workspace/api-keys", "POST", payload);
}

export async function getWorkspaceSettings() {
  const result = await backendRequest<{
    workspaceId: string;
    workspaceName: string;
    apiBaseUrl: string;
    authProvider: string;
    ingestionMode: string;
    masking: string;
    planId?: string | null;
    planName?: string | null;
  } | { detail?: string }>("/workspace/settings", "GET");
  return result.data;
}

export async function updateWorkspaceSettings(payload: {
  apiBaseUrl: string;
  authProvider: string;
  ingestionMode: string;
  masking: string;
}) {
  return backendRequest<{
    workspaceId: string;
    workspaceName: string;
    apiBaseUrl: string;
    authProvider: string;
    ingestionMode: string;
    masking: string;
    planId?: string | null;
    planName?: string | null;
  } | { detail?: string }>("/workspace/settings", "PUT", payload);
}

export async function getIntegrationStatus(): Promise<IntegrationStatusResponse> {
  const result = await backendRequest<IntegrationStatusResponse>("/integrations/status", "GET");
  if (!result.ok || "detail" in (result.data as IntegrationStatusResponse | { detail?: string })) {
    return {
      services: [
        {
          name: "Mobile SDK ingestion",
          status: "offline",
          path: "Sign in and send events from your app to see workspace health",
        },
      ],
    };
  }
  return result.data;
}

export async function getUsage(month?: string) {
  const suffix = month ? `?month=${encodeURIComponent(month)}` : "";
  return backendRequest<UsageResponse | { detail?: string }>(`/usage${suffix}`, "GET");
}

export async function getScreenshots(params?: { screen?: string; session_id?: string; latest?: boolean; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.screen) {
    query.set("screen", params.screen);
  }
  if (params?.session_id) {
    query.set("session_id", params.session_id);
  }
  if (params?.latest !== undefined) {
    query.set("latest", String(params.latest));
  }
  if (params?.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return backendRequest<ScreenshotRef[] | { detail?: string }>(`/screenshots${suffix}`, "GET");
}

export async function getLiquidOverview(): Promise<LiquidOverview> {
  const result = await backendRequest<LiquidOverview | { detail?: string }>("/liquid/overview", "GET");
  const data = result.data;
  if (!result.ok || (typeof data === "object" && data !== null && "detail" in data)) {
    return {
      keyCount: 0,
      bundleCount: 0,
      publishedKeyCount: 0,
      publishedBundleCount: 0,
      segmentCount: 0,
      activeExperimentCount: 0,
      runtimePath: "/liquid/runtime/bundles/resolve",
      cachePolicy: "private, max-age=60, stale-while-revalidate=300",
    };
  }
  return data as LiquidOverview;
}

export async function getLiquidKeys(query?: string): Promise<LiquidKeySummary[]> {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
  const result = await backendRequest<LiquidKeySummary[] | { detail?: string }>(`/liquid/keys${suffix}`, "GET");
  if (!result.ok || !Array.isArray(result.data)) {
    return [];
  }
  return result.data;
}

export async function getLiquidKeyDetail(keyId: string): Promise<LiquidKeyDetail | null> {
  const result = await backendRequest<LiquidKeyDetail | { detail?: string }>(`/liquid/keys/${keyId}`, "GET");
  const data = result.data;
  if (!result.ok || (typeof data === "object" && data !== null && "detail" in data)) {
    return null;
  }
  return data as LiquidKeyDetail;
}

export async function getLiquidSegments(): Promise<LiquidSegment[]> {
  const result = await backendRequest<LiquidSegment[] | { detail?: string }>("/liquid/segments", "GET");
  if (!result.ok || !Array.isArray(result.data)) {
    return [];
  }
  return result.data;
}

export async function getLiquidRules(): Promise<LiquidRule[]> {
  const result = await backendRequest<LiquidRule[] | { detail?: string }>("/liquid/rules", "GET");
  if (!result.ok || !Array.isArray(result.data)) {
    return [];
  }
  return result.data;
}

export async function getLiquidTraits(): Promise<LiquidTraitDefinition[]> {
  const result = await backendRequest<LiquidTraitDefinition[] | { detail?: string }>("/liquid/traits", "GET");
  if (!result.ok || !Array.isArray(result.data)) {
    return [];
  }
  return result.data;
}

export async function getLiquidProfiles(): Promise<LiquidProfile[]> {
  const result = await backendRequest<LiquidProfile[] | { detail?: string }>("/liquid/profiles", "GET");
  if (!result.ok || !Array.isArray(result.data)) {
    return [];
  }
  return result.data;
}

export async function getLiquidExperiments(): Promise<LiquidExperiment[]> {
  const result = await backendRequest<LiquidExperiment[] | { detail?: string }>("/liquid/experiments", "GET");
  if (!result.ok || !Array.isArray(result.data)) {
    return [];
  }
  return result.data;
}

export async function getLiquidBundles(): Promise<LiquidBundleSummary[]> {
  const result = await backendRequest<LiquidBundleSummary[] | { detail?: string }>("/liquid/bundles", "GET");
  if (!result.ok || !Array.isArray(result.data)) {
    return [];
  }
  return result.data;
}

export async function getLiquidBundleDetail(bundleId: string): Promise<LiquidBundleDetail | null> {
  const result = await backendRequest<LiquidBundleDetail | { detail?: string }>(`/liquid/bundles/${bundleId}`, "GET");
  const data = result.data;
  if (!result.ok || (typeof data === "object" && data !== null && "detail" in data)) {
    return null;
  }
  return data as LiquidBundleDetail;
}

export { backendBaseUrl };
