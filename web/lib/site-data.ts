import "server-only";
import { cookies } from "next/headers";

export type Insight = {
  title: string;
  impact: string;
  reason: string[];
  suggestions: string[];
  issue_type: string;
  screen: string;
  element_id?: string | null;
  frequency: number;
  affected_users_count: number;
};

export type HeatmapPoint = {
  x: number;
  y: number;
  count: number;
};

export type HeatmapResponse = {
  screen: string;
  points: HeatmapPoint[];
};

export type HeatmapScenarioStep = {
  screen: string;
  title: string;
  summary: string;
  focus_area: string;
  total_taps: number;
  clustered_points: number;
};

export type HeatmapScenario = {
  id: string;
  name: string;
  summary: string;
  steps: HeatmapScenarioStep[];
};

export type Issue = {
  id: string;
  type: string;
  screen: string | null;
  element_id?: string | null;
  frequency: number;
  affected_users_count: number;
  details: Record<string, string | number>;
  severity: string;
};

export type SessionSummary = {
  session_id: string;
  device_id: string;
  start_time: string;
  end_time: string;
  last_screen?: string | null;
  dropped_off: boolean;
};

export const navLinks = [
  { href: "/dashboard", label: "Dashboard", public: false },
  { href: "/usage", label: "Usage", public: false },
  { href: "/heatmap", label: "Heatmap", public: false },
  { href: "/pricing", label: "Pricing", public: true },
  { href: "/docs", label: "Docs", public: true },
  { href: "/profile", label: "Profile", public: false }
] as const;

export const heroStats = [
  { label: "Behaviors captured", value: "4.2M", detail: "+18% this week" },
  { label: "Drop-offs recovered", value: "31%", detail: "after 2 experiments" },
  { label: "Time to insight", value: "6m", detail: "from session to explanation" }
];

export const featureRows = [
  {
    glyph: "?",
    title: "Observe UX and fix UI before users vanish.",
    accent: "UX",
    align: "right"
  },
  {
    glyph: "!",
    title: "Make sense of every click, hesitation, and failed submit.",
    accent: "click",
    align: "left"
  },
  {
    glyph: "#",
    title: "Know exactly what to fix before revenue, trust, and activation leave.",
    accent: "leave",
    align: "right"
  }
] as const;

export const stepsEasy = [
  "Sign in to Maze",
  "Give your coding agent the MAZE_INTEGRATION.md file",
  "Watch the Maze unfold"
];

export const stepsHard = [
  {
    icon: "◉",
    title: "We load every tap, pause, and validation miss into a local event stream."
  },
  {
    icon: "∿",
    title: "We batch those interactions into a dataset and fire them through the pipeline."
  },
  {
    icon: "✦",
    title: "Our models tell you where friction lives, why it happens, and what to ship next."
  }
];

export const pricingPlans = [
  {
    name: "Starter",
    price: "$0",
    cadence: "/month",
    description: "For small teams validating onboarding and activation.",
    features: ["Up to 10k sessions", "3 product seats", "Core UX issue detection", "Email support"]
  },
  {
    name: "Growth",
    price: "$149",
    cadence: "/month",
    description: "For product teams that want continuous behavior intelligence.",
    features: ["250k sessions", "Unlimited dashboards", "Funnels, rage taps, dead taps", "Experiment recommendations"],
    featured: true
  },
  {
    name: "Scale",
    price: "Custom",
    cadence: "",
    description: "For companies rolling Maze into mobile and web across squads.",
    features: ["SSO + SCIM", "Data residency options", "Priority Slack support", "Dedicated onboarding architect"]
  }
];

export const profileMoments = [
  { label: "Role", value: "Principal Product Engineer" },
  { label: "Focus", value: "Onboarding and KYC journeys" },
  { label: "Team", value: "Growth Platform" },
  { label: "Workspace", value: "Maze HQ" }
];

const backendBaseUrl = (process.env.MAZE_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

async function authedFetch(path: string) {
  const token = (await cookies()).get("maze_session_token")?.value;
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${backendBaseUrl}${path}`, {
    cache: "no-store",
    headers,
  });
}

export async function getInsights(): Promise<Insight[]> {
  try {
    const response = await authedFetch("/insights");
    if (!response.ok) {
      return [];
    }
    return response.json();
  } catch {
    return [];
  }
}

export async function getSessionScreens(): Promise<string[]> {
  try {
    const response = await authedFetch("/sessions");
    if (!response.ok) {
      return [];
    }

    const sessions: Array<{ last_screen?: string | null }> = await response.json();
    const screens = new Set<string>();
    for (const session of sessions) {
      if (session.last_screen) {
        screens.add(session.last_screen);
      }
    }
    return Array.from(screens);
  } catch {
    return [];
  }
}

export async function getHeatmap(screen: string): Promise<HeatmapResponse> {
  try {
    const response = await authedFetch(`/heatmap?screen=${encodeURIComponent(screen)}`);
    if (!response.ok) {
      return { screen, points: [] };
    }
    return response.json();
  } catch {
    return { screen, points: [] };
  }
}

export async function getHeatmapScenario(): Promise<HeatmapScenario | null> {
  try {
    const response = await authedFetch("/heatmap/scenario");
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

export async function getIssues(): Promise<Issue[]> {
  try {
    const response = await authedFetch("/issues");
    if (!response.ok) {
      return [];
    }
    return response.json();
  } catch {
    return [];
  }
}

export async function getSessions(): Promise<SessionSummary[]> {
  try {
    const response = await authedFetch("/sessions");
    if (!response.ok) {
      return [];
    }
    return response.json();
  } catch {
    return [];
  }
}
