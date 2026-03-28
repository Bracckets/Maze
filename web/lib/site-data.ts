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

export const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/profile", label: "Profile" }
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

export async function getInsights(): Promise<Insight[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

  try {
    const response = await fetch(`${baseUrl}/insights`, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    return response.json();
  } catch {
    return [];
  }
}
