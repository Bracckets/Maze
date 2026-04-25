import type { DesignSystem, JsonRecord, Policy } from "./types";

const API_BASE = import.meta.env.VITE_POLLEX_API_BASE_URL ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "pollex_studio_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(path: "/studio/auth/login" | "/studio/auth/signup", email: string, password: string) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    throw new Error("Authentication failed");
  }
  const body = (await response.json()) as { token: string };
  setToken(body.token);
  return body;
}

export async function studioFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    }
  });
  if (response.status === 401) {
    clearToken();
    throw new Error("Studio session expired");
  }
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function updatePolicy(policy: Policy) {
  return studioFetch<Policy>(`/studio/policies/${policy.id}`, {
    method: "PUT",
    body: JSON.stringify({
      mode: policy.mode,
      allowed_adaptations: policy.allowed_adaptations,
      blocked_adaptations: policy.blocked_adaptations,
      risk_policy: policy.risk_policy,
      sensitive_context_rules: policy.sensitive_context_rules
    })
  });
}

export function updateDesignSystem(input: Pick<DesignSystem, "name" | "tokens" | "component_contracts" | "brand_voice">) {
  return studioFetch<DesignSystem>("/studio/design-system", {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export function createProject(input: { name: string; slug: string }) {
  return studioFetch("/studio/projects", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function runPlayground(input: JsonRecord) {
  return studioFetch("/studio/playground/resolve", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
