import type { DesignSystem, JsonRecord, Policy } from "./types";
import { hasSupabaseConfig, supabase, type AuthSession } from "./supabase";

const API_BASE = import.meta.env.VITE_POLLEX_API_BASE_URL ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "pollex_studio_token";
const USER_KEY = "pollex_studio_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id?: string; email?: string };
  } catch {
    return null;
  }
}

function setStoredUser(user: { id?: string; email?: string }) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function login(path: "/studio/auth/login" | "/studio/auth/signup", email: string, password: string) {
  if (hasSupabaseConfig && supabase) {
    const result =
      path === "/studio/auth/signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
    if (result.error || !result.data.session) {
      throw new Error(result.error?.message ?? "Authentication failed");
    }
    const session: AuthSession = {
      token: result.data.session.access_token,
      user: { id: result.data.user?.id ?? "", email: result.data.user?.email },
      session: result.data.session
    };
    setToken(session.token);
    setStoredUser(session.user);
    return session;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    throw new Error("Authentication failed");
  }
  const body = (await response.json()) as { token: string; user?: { id?: string; email?: string } };
  setToken(body.token);
  setStoredUser(body.user ?? { email });
  return body;
}

export async function restoreSupabaseSession() {
  if (!hasSupabaseConfig || !supabase) return getToken();
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    setToken(data.session.access_token);
    setStoredUser({ id: data.session.user.id, email: data.session.user.email });
    return data.session.access_token;
  }
  clearToken();
  return null;
}

export async function signOut() {
  if (hasSupabaseConfig && supabase) {
    await supabase.auth.signOut();
  }
  clearToken();
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

export function createApiKey(projectId: string, input: { name: string; environment: string }) {
  return studioFetch(`/studio/projects/${projectId}/api-keys`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function revokeApiKey(keyId: string) {
  return studioFetch(`/studio/api-keys/${keyId}/revoke`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function runPlayground(input: JsonRecord) {
  return studioFetch("/studio/playground/resolve", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
