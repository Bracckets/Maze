import { randomBytes } from "crypto";

type HttpMethod = "GET" | "POST" | "PUT";

export type IntegrationService = {
  name: string;
  status: string;
  path: string;
};

export type IntegrationStatusResponse = {
  services: IntegrationService[];
};

const serviceUrls = {
  auth: process.env.MAZE_AUTH_SERVICE_URL,
  apiKeys: process.env.MAZE_API_KEYS_SERVICE_URL,
  workspace: process.env.MAZE_WORKSPACE_SERVICE_URL,
  integrations: process.env.MAZE_INTEGRATIONS_SERVICE_URL
};

async function proxyRequest(serviceUrl: string | undefined, path: string, method: HttpMethod, body?: unknown) {
  if (!serviceUrl) {
    return null;
  }

  const response = await fetch(`${serviceUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });

  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

export async function signInWithProvider(payload: { email: string; password: string }) {
  const proxied = await proxyRequest(serviceUrls.auth, "/signin", "POST", payload);
  if (proxied) {
    return proxied;
  }

  const valid = payload.email.includes("@") && payload.password.length >= 8;
  return {
    ok: valid,
    status: valid ? 200 : 400,
    data: valid
      ? {
          user: {
            id: "usr_demo_01",
            email: payload.email,
            name: "Amina Noor",
            workspace: "Maze HQ"
          },
          token: "demo-session-token"
        }
      : { error: "Use a valid email and a password with at least 8 characters." }
  };
}

export async function listApiKeys() {
  const proxied = await proxyRequest(serviceUrls.apiKeys, "", "GET");
  if (proxied) {
    return proxied.data;
  }

  return {
    keys: [
      {
        id: "key_live_primary",
        name: "Primary ingestion key",
        prefix: "mz_live_",
        lastUsedAt: "2026-03-28T10:42:00Z",
        createdAt: "2026-03-12T08:15:00Z"
      },
      {
        id: "key_test_ios",
        name: "iOS sandbox key",
        prefix: "mz_test_",
        lastUsedAt: "2026-03-28T09:58:00Z",
        createdAt: "2026-03-18T14:00:00Z"
      }
    ]
  };
}

export async function createApiKey(payload: { name: string; environment: "test" | "live" }) {
  const proxied = await proxyRequest(serviceUrls.apiKeys, "", "POST", payload);
  if (proxied) {
    return proxied;
  }

  const prefix = payload.environment === "live" ? "mz_live_" : "mz_test_";
  return {
    ok: true,
    status: 201,
    data: {
      key: {
        id: `key_${payload.environment}_${Date.now()}`,
        name: payload.name,
        token: `${prefix}${randomBytes(12).toString("hex")}`,
        createdAt: new Date().toISOString()
      }
    }
  };
}

export async function getWorkspaceSettings() {
  const proxied = await proxyRequest(serviceUrls.workspace, "/settings", "GET");
  if (proxied) {
    return proxied.data;
  }

  return {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000",
    authProvider: serviceUrls.auth ? "external" : "mock",
    ingestionMode: "batched",
    masking: "strict"
  };
}

export async function updateWorkspaceSettings(payload: Record<string, string>) {
  const proxied = await proxyRequest(serviceUrls.workspace, "/settings", "PUT", payload);
  if (proxied) {
    return proxied;
  }

  return {
    ok: true,
    status: 200,
    data: {
      saved: true,
      settings: payload
    }
  };
}

export async function getIntegrationStatus(): Promise<IntegrationStatusResponse> {
  const proxied = await proxyRequest(serviceUrls.integrations, "/status", "GET");
  if (proxied) {
    return proxied.data;
  }

  return {
    services: [
      { name: "Sign in API", status: serviceUrls.auth ? "connected" : "mock", path: "/api/auth/signin" },
      { name: "API key service", status: serviceUrls.apiKeys ? "connected" : "mock", path: "/api/workspace/api-keys" },
      { name: "Workspace settings", status: serviceUrls.workspace ? "connected" : "mock", path: "/api/workspace/settings" },
      { name: "Insight ingestion", status: "ready", path: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/events" }
    ]
  };
}
