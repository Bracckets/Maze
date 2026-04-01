import { cookies } from "next/headers";

type HttpMethod = "GET" | "POST" | "PUT";

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

export { backendBaseUrl };
