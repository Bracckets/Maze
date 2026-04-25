import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { useForm } from "react-hook-form";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { z } from "zod";

import "./styles.css";
import {
  clearToken,
  createApiKey,
  createProject,
  getStoredUser,
  getToken,
  login,
  restoreSupabaseSession,
  revokeApiKey,
  runPlayground,
  signOut,
  studioFetch,
  updateDesignSystem,
  updatePolicy,
} from "./api";
import { DemoPage } from "./demo";
import { hasSupabaseConfig } from "./supabase";
import type {
  ApiKey,
  Decision,
  DesignSystem,
  ElementRow,
  Overview,
  PlaygroundPreset,
  PlaygroundTrace,
  Policy,
  Profile,
  Project,
  StudioSettings,
} from "./types";
import {
  Button,
  EmptyState,
  JsonBlock,
  Metric,
  ModeBadge,
  Panel,
  TextInput,
  TraitTag,
} from "./ui";

const queryClient = new QueryClient();
const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
const fields = [
  "text",
  "size",
  "tooltip",
  "helper_text",
  "aria_label",
  "color",
  "position",
  "layout",
];

function RootLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isAuth = pathname === "/login" || pathname === "/signup";
  return isAuth ? <Outlet /> : <Shell />;
}

function Shell() {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasSession, setHasSession] = useState(() => Boolean(getToken()));
  useEffect(() => {
    let mounted = true;
    restoreSupabaseSession().then((token) => {
      if (mounted) setHasSession(Boolean(token));
    });
    return () => {
      mounted = false;
    };
  }, []);
  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { to: "/projects", label: "Projects", icon: "projects" },
    { to: "/elements", label: "Elements", icon: "elements" },
    { to: "/profiles", label: "Profiles", icon: "profiles" },
    { to: "/decisions", label: "Decisions", icon: "decisions" },
    { to: "/policies", label: "Policies", icon: "policies" },
    { to: "/design-system", label: "Design System", icon: "design" },
    { to: "/playground", label: "Playground", icon: "playground" },
    { to: "/demo", label: "Demo", icon: "demo" },
    { to: "/settings", label: "Settings", icon: "settings" },
    { to: "/account", label: "Account", icon: "account" },
    { to: "/docs", label: "Docs", icon: "docs" },
  ];
  return (
    <div className="min-h-screen bg-gray-50">
      <aside
        className={`fixed inset-y-0 left-0 hidden border-r border-gray-200 bg-white transition-[width] duration-200 lg:block ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className={`border-b border-gray-200 py-5 ${isCollapsed ? "px-3" : "px-6"}`}>
          <div className={`flex items-start ${isCollapsed ? "justify-center" : "justify-between gap-3"}`}>
            <div className="flex min-w-0 flex-col items-start gap-1">
              <img
                src="/logo.png"
                alt=""
                className={`${isCollapsed ? "h-3 w-12" : "h-8 w-auto"} self-start object-contain object-left`}
              />
              {!isCollapsed ? <div className="text-lg font-bold text-gray-950">Pollex Studio</div> : null}
            </div>
            <button
              type="button"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!isCollapsed}
              onClick={() => setIsCollapsed((current) => !current)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-gray-300 bg-white text-gray-700 transition hover:bg-white hover:text-[#0E0E0F]"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                {isCollapsed ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
              </svg>
            </button>
          </div>
          {!isCollapsed ? <div className="mt-1 text-xs text-gray-500">Tactus control surface</div> : null}
        </div>
        <nav className="space-y-1 p-3">
          {nav.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              title={label}
              className={`flex items-center rounded-full text-sm text-gray-700 transition hover:bg-neutral-900 [&.active]:bg-indigo-50 [&.active]:font-medium [&.active]:text-indigo-700 ${
                isCollapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2"
              }`}
            >
              <NavIcon icon={icon} className="h-4 w-4 shrink-0" />
              {isCollapsed ? <span className="sr-only">{label}</span> : <span>{label}</span>}
            </Link>
          ))}
        </nav>
      </aside>
      <main className={`transition-[padding] duration-200 ${isCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white/90 px-5 backdrop-blur">
          <div className="text-sm font-medium text-gray-700">
            localhost:5173
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut();
              setHasSession(false);
              void navigate({ to: "/login" });
            }}
          >
            Sign out
          </Button>
        </header>
        <div className="mx-auto max-w-7xl p-5 lg:p-6">
          {!hasSession ? (
            <Panel title="Studio session">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-gray-600">
                  Log in to connect Studio to the Tactus API.
                </p>
                <Link
                  to="/login"
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Log in
                </Link>
              </div>
            </Panel>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}

function NavIcon({ icon, className }: { icon: string; className: string }) {
  const paths: Record<string, JSX.Element> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    projects: <path d="M3 6.5h7l2 2h9v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    elements: <path d="M4 5h16M4 12h16M4 19h16" />,
    profiles: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
    decisions: <path d="M5 5h14v14H5zM8 12h8M12 8v8" />,
    policies: <path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7z" />,
    design: <path d="M4 20l6-16h4l6 16M7 14h10" />,
    playground: <path d="M8 5l10 7-10 7z" />,
    demo: <path d="M4 7h16M7 4v16M17 4v16M4 17h16" />,
    settings: <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5zM19.4 15a1.7 1.7 0 0 0 .34 1.88l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .92V20a2 2 0 0 1-4 0v-.06a1.7 1.7 0 0 0-1-.92 1.7 1.7 0 0 0-1.88.34l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.92-1H3.6a2 2 0 0 1 0-4h.06a1.7 1.7 0 0 0 .92-1 1.7 1.7 0 0 0-.34-1.88l-.04-.04a2 2 0 0 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.92V3.6a2 2 0 0 1 4 0v.06a1.7 1.7 0 0 0 1 .92 1.7 1.7 0 0 0 1.88-.34l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04A1.7 1.7 0 0 0 19.4 9c.17.36.5.7.92 1h.08a2 2 0 0 1 0 4h-.06a1.7 1.7 0 0 0-.94 1z" />,
    account: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
    docs: <path d="M7 3h7l4 4v14H7zM14 3v5h5M10 13h6M10 17h4" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      {paths[icon]}
    </svg>
  );
}

function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "admin@pollex.dev", password: "pollex123" },
  });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof authSchema>) =>
      login(
        mode === "login" ? "/studio/auth/login" : "/studio/auth/signup",
        values.email,
        values.password,
      ),
    onSuccess: () => void navigate({ to: "/dashboard" }),
  });
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6"
      >
        <div className="mb-6 flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-5 w-auto object-contain" />
          <div className="text-sm font-semibold text-gray-950">
            Pollex Studio
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-950">
          {mode === "login" ? "Log into Studio" : "Create Studio account"}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Use any email and a password with at least six characters for local
          development.
        </p>
        <label className="mt-6 block">
          <span className="field-label">Email</span>
          <TextInput className="mt-2" {...form.register("email")} />
        </label>
        <label className="mt-4 block">
          <span className="field-label">Password</span>
          <TextInput
            className="mt-2"
            type="password"
            {...form.register("password")}
          />
        </label>
        {mutation.error ? (
          <div className="mt-3 text-sm text-red-600">
            {mutation.error.message}
          </div>
        ) : null}
        <Button className="mt-6 w-full" disabled={mutation.isPending}>
          {mode === "login" ? "Log in" : "Sign up"}
        </Button>
        <Link
          to={mode === "login" ? "/signup" : "/login"}
          className="mt-4 block text-center text-sm text-indigo-600"
        >
          {mode === "login" ? "Need an account?" : "Already have an account?"}
        </Link>
      </form>
    </div>
  );
}

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: () => studioFetch<Overview>("/studio/overview"),
  });
  if (isLoading || !data) return <EmptyState title="Loading dashboard..." />;
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <PageTitle
          title="Dashboard"
          subtitle="Observe, guard, and measure Tactus decisions."
        />
        <img
          src="/pollex-shapes/triangle.png"
          alt=""
          className="mt-1 hidden h-10 w-10 object-contain opacity-70 sm:block"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Elements" value={data.total_observed_elements} />
        <Metric label="Active profiles" value={data.active_profiles_7d} />
        <Metric label="24h decisions" value={data.decisions_24h} />
        <Metric label="7d decisions" value={data.decisions_7d} />
        <Metric label="Fallback rate" value={`${data.fallback_rate}%`} />
        <Metric label="Policy blocks" value={data.policy_blocked_count} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Top traits">
          <Chart data={data.top_traits} x="trait" y="count" type="bar" />
        </Panel>
        <Panel title="Decisions over time">
          <Chart
            data={data.decisions_over_time}
            x="date"
            y="count"
            type="line"
          />
        </Panel>
      </div>
    </div>
  );
}

function ProjectsPage() {
  const client = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => studioFetch<Project[]>("/studio/projects"),
  });
  const form = useForm({ defaultValues: { name: "", slug: "" } });
  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      form.reset();
      void client.invalidateQueries({ queryKey: ["projects"] });
    },
  });
  return (
    <div className="space-y-5">
      <PageTitle
        title="Projects"
        subtitle="Create projects that own Tactus environments."
      />
      <Panel title="Create project">
        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <TextInput placeholder="Project name" {...form.register("name")} />
          <TextInput placeholder="slug" {...form.register("slug")} />
          <Button>Create</Button>
        </form>
      </Panel>
      <DataTable
        columns={["name", "slug", "created_at"]}
        rows={data.map((row) => ({ ...row }))}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {data.map((project) => (
          <ProjectApiKeysPanel key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

function ProjectApiKeysPanel({ project }: { project: Project }) {
  const client = useQueryClient();
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null);
  const form = useForm({ defaultValues: { name: "Browser SDK", environment: "development" } });
  const { data = [] } = useQuery({
    queryKey: ["api-keys", project.id],
    queryFn: () => studioFetch<ApiKey[]>(`/studio/projects/${project.id}/api-keys`),
  });
  const createMutation = useMutation({
    mutationFn: (values: { name: string; environment: string }) => createApiKey(project.id, values) as Promise<ApiKey>,
    onSuccess: (key) => {
      setCreatedKey(key);
      form.reset({ name: "Browser SDK", environment: "development" });
      void client.invalidateQueries({ queryKey: ["api-keys", project.id] });
    },
  });
  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => revokeApiKey(keyId),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["api-keys", project.id] }),
  });

  return (
    <Panel title={`${project.name} API keys`}>
      <form
        className="grid gap-3 md:grid-cols-[1fr_150px_auto]"
        onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
      >
        <TextInput placeholder="Key name" {...form.register("name")} />
        <TextInput placeholder="environment" {...form.register("environment")} />
        <Button disabled={createMutation.isPending}>Create key</Button>
      </form>
      {createdKey?.key ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="text-xs font-semibold text-amber-800">Copy this key now. It is shown once.</div>
          <code className="mt-2 block overflow-x-auto rounded-lg bg-white p-2 text-xs text-gray-900">{createdKey.key}</code>
        </div>
      ) : null}
      <div className="mt-4 space-y-2">
        {data.length ? (
          data.map((key) => (
            <div key={key.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
              <div>
                <div className="text-sm font-semibold text-gray-950">{key.name ?? "SDK key"}</div>
                <div className="text-xs text-gray-500">
                  {key.environment} / {key.key_prefix}...{key.last_four} / {key.revoked_at ? "revoked" : "active"}
                </div>
              </div>
              <Button
                variant="secondary"
                disabled={Boolean(key.revoked_at) || revokeMutation.isPending}
                onClick={() => revokeMutation.mutate(key.id)}
              >
                Revoke
              </Button>
            </div>
          ))
        ) : (
          <EmptyState title="No API keys yet." />
        )}
      </div>
    </Panel>
  );
}

function ElementsPage() {
  const { data = [] } = useQuery({
    queryKey: ["elements"],
    queryFn: () => studioFetch<ElementRow[]>("/studio/elements"),
  });
  return (
    <div className="space-y-5">
      <PageTitle
        title="Elements"
        subtitle="Observed UI elements and recent Tactus activity."
      />
      <div className="panel overflow-hidden">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              {[
                "element_key",
                "type",
                "intent",
                "last_seen",
                "mode",
                "recent_decisions",
              ].map((h) => (
                <th key={h} className="px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {data.map((row) => (
              <tr key={row.element_key}>
                <td className="table-cell font-mono">
                  <Link
                    to="/elements/$elementKey"
                    params={{ elementKey: row.element_key }}
                    className="text-indigo-600"
                  >
                    {row.element_key}
                  </Link>
                </td>
                <td className="table-cell">{row.type}</td>
                <td className="table-cell">{row.intent}</td>
                <td className="table-cell">{formatDate(row.last_seen_at)}</td>
                <td className="table-cell">
                  <ModeBadge mode={row.mode} />
                </td>
                <td className="table-cell">{row.recent_decisions ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ElementDetailPage() {
  const { elementKey } = elementRoute.useParams();
  const { data } = useQuery({
    queryKey: ["element", elementKey],
    queryFn: () =>
      studioFetch<{
        element: ElementRow;
        policy: Policy;
        recent_decisions: Decision[];
        trait_distribution: Array<{ trait: string; count: number }>;
      }>(`/studio/elements/${elementKey}`),
  });
  if (!data) return <EmptyState title="Loading element..." />;
  return (
    <div className="space-y-5">
      <PageTitle
        title={data.element.element_key}
        subtitle={`${data.element.type} / ${data.element.intent ?? "unknown intent"}`}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Element metadata">
          <JsonBlock value={data.element} />
        </Panel>
        <Panel title="Current policy">
          <JsonBlock value={data.policy} />
        </Panel>
      </div>
      <Panel title="Trait distribution">
        <Chart data={data.trait_distribution} x="trait" y="count" type="bar" />
      </Panel>
      <DecisionsTable decisions={data.recent_decisions} />
    </div>
  );
}

function ProfilesPage() {
  const { data = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => studioFetch<Profile[]>("/studio/profiles"),
  });
  return (
    <div className="space-y-5">
      <PageTitle
        title="Profiles"
        subtitle="Aggregate UX traits, scores, and counters."
      />
      <div className="panel overflow-hidden">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              {["subject_id", "last_seen", "top_traits", "decision_count"].map(
                (h) => (
                  <th key={h} className="px-4 py-3">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {data.map((row) => (
              <tr key={row.subject_id}>
                <td className="table-cell font-mono">
                  <Link
                    to="/profiles/$subjectId"
                    params={{ subjectId: row.subject_id }}
                    className="text-indigo-600"
                  >
                    {row.subject_id}
                  </Link>
                </td>
                <td className="table-cell">{formatDate(row.last_seen_at)}</td>
                <td className="table-cell">
                  <TraitList traits={row.traits} />
                </td>
                <td className="table-cell">{row.decision_count ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfileDetailPage() {
  const { subjectId } = profileRoute.useParams();
  const { data } = useQuery({
    queryKey: ["profile", subjectId],
    queryFn: () =>
      studioFetch<{
        profile: Profile;
        events: unknown[];
        decisions: Decision[];
      }>(`/studio/profiles/${subjectId}`),
  });
  if (!data) return <EmptyState title="Loading profile..." />;
  return (
    <div className="space-y-5">
      <PageTitle
        title={data.profile.subject_id}
        subtitle={`Anonymous ID: ${data.profile.anonymous_id ?? "none"}`}
      />
      <Panel title="Traits">
        <TraitList traits={data.profile.traits} />
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Scores">
          <ScoreList scores={data.profile.scores} />
        </Panel>
        <Panel title="Counters">
          <JsonBlock value={data.profile.counters} />
        </Panel>
      </div>
      <Panel title="Recent events">
        <JsonBlock value={data.events} />
      </Panel>
      <DecisionsTable decisions={data.decisions} />
    </div>
  );
}

function DecisionsPage() {
  const { data = [] } = useQuery({
    queryKey: ["decisions"],
    queryFn: () => studioFetch<Decision[]>("/studio/decisions"),
  });
  return (
    <div className="space-y-5">
      <PageTitle
        title="Decision audit log"
        subtitle="Every persisted Tactus resolve result."
      />
      <DecisionsTable decisions={data} link />
    </div>
  );
}

function DecisionDetailPage() {
  const { decisionId } = decisionRoute.useParams();
  const { data } = useQuery({
    queryKey: ["decision", decisionId],
    queryFn: () => studioFetch(`/studio/decisions/${decisionId}`),
  });
  if (!data) return <EmptyState title="Loading decision..." />;
  return (
    <div className="space-y-5">
      <PageTitle
        title={`Decision ${decisionId.slice(0, 8)}`}
        subtitle="Policy, profile, and blocked adaptation context."
      />
      <JsonBlock value={data} />
    </div>
  );
}

function PoliciesPage() {
  const client = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["policies"],
    queryFn: () => studioFetch<Policy[]>("/studio/policies"),
  });
  return (
    <div className="space-y-5">
      <PageTitle
        title="Policies"
        subtitle="Control observe, suggest, and autopilot guardrails."
      />
      {data.length === 0 ? (
        <EmptyState title="No policies yet. Create policy rows directly or through future project setup." />
      ) : null}
      {data.map((policy) => (
        <PolicyEditor
          key={policy.id}
          policy={policy}
          onSaved={() =>
            void client.invalidateQueries({ queryKey: ["policies"] })
          }
        />
      ))}
    </div>
  );
}

function PolicyEditor({
  policy,
  onSaved,
}: {
  policy: Policy;
  onSaved: () => void;
}) {
  const form = useForm<Policy>({ defaultValues: policy });
  const mutation = useMutation({
    mutationFn: updatePolicy,
    onSuccess: onSaved,
  });
  const currentMode = form.watch("mode");
  return (
    <Panel
      title={`${policy.scope} policy ${policy.element_key ? `/${policy.element_key}` : ""}`}
    >
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit((values) => {
          if (
            policy.mode === "autopilot" &&
            values.mode === "observe" &&
            !window.confirm(
              "Switching to observe will stop auto-applying adaptations. Existing decisions are kept.",
            )
          )
            return;
          mutation.mutate(values);
        })}
      >
        <label className="block">
          <span className="field-label">Mode</span>
          <select
            className="mt-2 rounded-md border border-gray-300 px-3 py-2 text-sm"
            {...form.register("mode")}
          >
            <option value="observe">observe</option>
            <option value="suggest">suggest</option>
            <option value="autopilot">autopilot</option>
          </select>
          <span className="ml-3">
            <ModeBadge mode={currentMode} />
          </span>
        </label>
        <CheckboxGrid
          title="Allowed adaptations"
          form={form}
          prefix="allowed_adaptations"
        />
        <CheckboxGrid
          title="Blocked adaptations"
          form={form}
          prefix="blocked_adaptations"
        />
        <CheckboxGrid
          title="Risk policy"
          form={form}
          prefix="risk_policy"
          names={["allow_medium_risk", "allow_high_risk"]}
        />
        <CheckboxGrid
          title="Sensitive context"
          form={form}
          prefix="sensitive_context_rules"
          names={["allow_text"]}
        />
        <Button disabled={mutation.isPending}>Save policy</Button>
      </form>
    </Panel>
  );
}

function DesignSystemPage() {
  const client = useQueryClient();
  const { data, error, isError, isLoading, refetch } = useQuery({
    queryKey: ["design-system"],
    queryFn: () => studioFetch<DesignSystem>("/studio/design-system"),
  });
  const [tokens, setTokens] = useState("");
  const [contracts, setContracts] = useState("");
  const [voice, setVoice] = useState("");
  useEffect(() => {
    if (data) {
      setTokens(JSON.stringify(data.tokens, null, 2));
      setContracts(JSON.stringify(data.component_contracts, null, 2));
      setVoice(JSON.stringify(data.brand_voice, null, 2));
    }
  }, [data]);
  const mutation = useMutation({
    mutationFn: () =>
      updateDesignSystem({
        name: data?.name ?? "Default Design System",
        tokens: JSON.parse(tokens),
        component_contracts: JSON.parse(contracts),
        brand_voice: JSON.parse(voice),
      }),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["design-system"] }),
  });
  if (isLoading) return <EmptyState title="Loading design system..." />;
  if (isError) {
    return (
      <Panel title="Design system unavailable">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            {error instanceof Error ? error.message : "Studio could not load the design system."}
          </p>
          <Button variant="secondary" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      </Panel>
    );
  }
  if (!data) return <EmptyState title="No design system returned." />;
  return (
    <div className="space-y-5">
      <PageTitle
        title="Design system"
        subtitle="Editing creates a new version and keeps the old guardrails intact."
      />
      <Metric label="Current version" value={`v${data.version}`} />
      <div className="grid gap-5 lg:grid-cols-3">
        <JsonEditor title="Tokens" value={tokens} onChange={setTokens} />
        <JsonEditor
          title="Component contracts"
          value={contracts}
          onChange={setContracts}
        />
        <JsonEditor title="Brand voice" value={voice} onChange={setVoice} />
      </div>
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        Create new version
      </Button>
    </div>
  );
}

function PlaygroundPage() {
  const { data: presets = [] } = useQuery({
    queryKey: ["presets"],
    queryFn: () =>
      studioFetch<PlaygroundPreset[]>("/studio/playground/presets"),
  });
  const [presetId, setPresetId] = useState("confident");
  const preset = presets.find((item) => item.id === presetId) ?? presets[0];
  const [profile, setProfile] = useState("{}");
  const [policy, setPolicy] = useState("{}");
  const [context, setContext] = useState("{}");
  const [trace, setTrace] = useState<PlaygroundTrace | null>(null);
  useEffect(() => {
    if (preset) {
      setProfile(JSON.stringify(preset.profile, null, 2));
      setPolicy(JSON.stringify(preset.policy, null, 2));
      setContext(JSON.stringify(preset.context, null, 2));
      setTrace(null);
    }
  }, [preset?.id]);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!preset) throw new Error("No preset selected");
      return runPlayground({
        subject_id: "playground_user",
        element: preset.element,
        allow: { text: true, size: true, tooltip: true, helper_text: true },
        constraints: { maxTextLength: 24, emoji: false, tone: "clear" },
        context: JSON.parse(context),
        traits: {},
        profile: JSON.parse(profile),
        policy: JSON.parse(policy),
        design_system: {
          tokens: {
            sizes: ["sm", "md", "lg"],
            variants: ["primary", "secondary"],
          },
        },
      }) as Promise<PlaygroundTrace>;
    },
    onSuccess: setTrace,
  });
  const passed = trace && preset ? expectedPassed(preset, trace) : false;
  return (
    <div className="space-y-5">
      <PageTitle
        title="Playground"
        subtitle="Run the full Tactus loop for a simulated user."
      />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Panel title="Input">
          <div className="space-y-4">
            <label className="block">
              <span className="field-label">Preset</span>
              <select
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={presetId}
                onChange={(event) => setPresetId(event.target.value)}
              >
                {presets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <JsonEditor
              title="Profile"
              value={profile}
              onChange={setProfile}
              compact
            />
            <JsonEditor
              title="Policy"
              value={policy}
              onChange={setPolicy}
              compact
            />
            <JsonEditor
              title="Context"
              value={context}
              onChange={setContext}
              compact
            />
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              Run Tactus loop
            </Button>
          </div>
        </Panel>
        <Panel
          title="Trace"
          action={
            trace ? (
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
              >
                {passed ? "expected outcome" : "check outcome"}
              </span>
            ) : null
          }
        >
          {!trace ? (
            <EmptyState title="Run a preset to inspect the profile, proposal, validation, decision, and preview." />
          ) : (
            <TraceView trace={trace} />
          )}
        </Panel>
      </div>
    </div>
  );
}

function DocsPage() {
  const docs = [
    "PRODUCT_VISION.md",
    "TACTUS_ENGINE_ARCHITECTURE.md",
    "PRIVACY_AND_SAFETY.md",
    "DESIGN_SYSTEM_GUARDRAILS.md",
    "POLLEX_SDK_INTEGRATION.md",
  ];
  return (
    <div className="space-y-5">
      <PageTitle
        title="Docs"
        subtitle="Project documents generated across Pollex phases."
      />
      <Panel>
        <div className="grid gap-3 md:grid-cols-2">
          {docs.map((doc) => (
            <div
              key={doc}
              className="rounded-md border border-gray-200 p-4 font-mono text-sm text-gray-700"
            >
              pollex/docs/{doc}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function AccountPage() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => studioFetch<{ id: string; email: string }>("/studio/auth/me"),
  });
  const current = data ?? user;
  return (
    <div className="space-y-5">
      <PageTitle title="Account" subtitle="Studio identity and session state." />
      <Panel title="Supabase user">
        <div className="grid gap-3 md:grid-cols-2">
          <Metric label="Email" value={current?.email ?? "Unknown"} />
          <Metric label="User ID" value={current?.id ? maskMiddle(current.id) : "Local dev"} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-3">
          <div>
            <div className="text-sm font-semibold text-gray-950">Session</div>
            <div className="text-xs text-gray-500">{hasSupabaseConfig ? "Supabase access token" : "Local development token"}</div>
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut();
              void navigate({ to: "/login" });
            }}
          >
            Sign out
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function SettingsPage() {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => studioFetch<StudioSettings>("/studio/settings"),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => studioFetch<Project[]>("/studio/projects"),
  });
  if (!data) return <EmptyState title="Loading settings..." />;
  return (
    <div className="space-y-5">
      <PageTitle title="Settings" subtitle="Pre-beta integration and deployment controls." />
      <div className="rounded-3xl border border-[#2A2D31] bg-[#0E0E0F] p-5 text-white">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Environment" value={data.environment} />
          <Metric label="Projects" value={projects.length} />
          <Metric label="Agent provider" value={data.agents.provider} />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Supabase">
          <StatusRow label="URL" active={data.supabase.url_configured} />
          <StatusRow label="Anon key" active={data.supabase.anon_key_configured} />
          <StatusRow label="JWT secret" active={data.supabase.jwt_secret_configured} />
        </Panel>
        <Panel title="Backend">
          <StatusRow label="Auto-create database" active={data.api.auto_create_database} />
          <StatusRow label="Auto-create tables" active={data.api.auto_create_tables} />
          <div className="mt-3 text-xs text-gray-500">CORS origins</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.api.cors_origins.map((origin) => (
              <TraitTag key={origin} trait={origin} />
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Project API keys">
        <div className="space-y-2">
          {projects.length ? (
            projects.map((project) => (
              <Link
                key={project.id}
                to="/projects"
                className="flex items-center justify-between rounded-xl border border-gray-200 p-3 text-sm transition hover:bg-gray-50"
              >
                <span className="font-medium text-gray-950">{project.name}</span>
                <span className="text-gray-500">{project.slug}</span>
              </Link>
            ))
          ) : (
            <EmptyState title="Create a project before issuing API keys." />
          )}
        </div>
      </Panel>
    </div>
  );
}

function StatusRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-gray-950 text-white" : "bg-gray-100 text-gray-500"}`}>
        {active ? "Configured" : "Missing"}
      </span>
    </div>
  );
}

function TraceView({ trace }: { trace: PlaygroundTrace }) {
  return (
    <div className="space-y-3">
      {[
        ["Step 1 - Profile", trace.profile_used],
        ["Step 2 - Proposal", trace.proposal ?? "No proposal"],
        ["Step 3 - Validation", trace.validation_result],
        ["Step 4 - Decision", trace.final_decision],
      ].map(([title, value]) => (
        <details
          key={String(title)}
          open
          className="rounded-md border border-gray-200 bg-white"
        >
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-800">
            {String(title)}
          </summary>
          <div className="border-t border-gray-200 p-4">
            <JsonBlock value={value} />
          </div>
        </details>
      ))}
      <details open className="rounded-md border border-gray-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-800">
          Step 5 - Preview
        </summary>
        <div className="border-t border-gray-200 p-6">
          {renderPreview(trace)}
        </div>
      </details>
    </div>
  );
}

function renderPreview(trace: PlaygroundTrace) {
  const preview = trace.rendered_preview as {
    element?: { type?: string; default_props?: Record<string, unknown> };
    props?: Record<string, unknown>;
  };
  const props = preview.props ?? {};
  const text = String(props.text ?? "Continue");
  const size =
    typeof props.size === "string" ? `pollex-size-${props.size}` : "";
  if (preview.element?.type === "text")
    return <span className="text-sm text-gray-800">{text}</span>;
  return (
    <button
      className={`rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white ${size}`}
      title={typeof props.tooltip === "string" ? props.tooltip : undefined}
    >
      {text}
    </button>
  );
}

function expectedPassed(preset: PlaygroundPreset, trace: PlaygroundTrace) {
  const decision = trace.final_decision;
  if (preset.id === "confident") return decision.fallback;
  if (preset.id === "hesitant")
    return decision.adaptations.text === "Next step";
  if (preset.id === "missed-tap") return decision.adaptations.size === "lg";
  if (preset.id === "arabic")
    return (
      typeof decision.adaptations.text === "string" &&
      decision.adaptations.text.length > 0
    );
  if (preset.id === "sensitive")
    return (
      decision.fallback ||
      (trace.validation_result.blocked as unknown[] | undefined)?.length
    );
  return false;
}

function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-3xl font-bold leading-9 text-gray-950">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

function Chart({
  data,
  x,
  y,
  type,
}: {
  data: Record<string, unknown>[];
  x: string;
  y: string;
  type: "bar" | "line";
}) {
  if (data.length === 0) return <EmptyState title="No chart data yet." />;
  const ChartTag = type === "bar" ? BarChart : LineChart;
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ChartTag data={data}>
          <CartesianGrid stroke="#2A2D31" strokeDasharray="3 3" />
          <XAxis
            dataKey={x}
            stroke="#A1A1AA"
            tick={{ fill: "#A1A1AA", fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            stroke="#A1A1AA"
            tick={{ fill: "#A1A1AA", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              background: "#171719",
              border: "1px solid #2A2D31",
              borderRadius: 12,
              color: "#FFFFFF",
            }}
            labelStyle={{ color: "#FFFFFF" }}
          />
          {type === "bar" ? (
            <Bar dataKey={y} fill="#FFFFFF" radius={[8, 8, 0, 0]} />
          ) : (
            <Line
              type="monotone"
              dataKey={y}
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          )}
        </ChartTag>
      </ResponsiveContainer>
    </div>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  if (rows.length === 0) return <EmptyState title="No rows yet." />;
  return (
    <div className="panel overflow-hidden">
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, index) => (
            <tr key={String(row.id ?? index)}>
              {columns.map((column) => (
                <td key={column} className="table-cell">
                  {String(row[column] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DecisionsTable({
  decisions,
  link = false,
}: {
  decisions: Decision[];
  link?: boolean;
}) {
  if (decisions.length === 0) return <EmptyState title="No decisions yet." />;
  return (
    <div className="panel overflow-hidden">
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            {[
              "id",
              "element_key",
              "subject_id",
              "mode",
              "fallback",
              "policy_passed",
              "created_at",
            ].map((h) => (
              <th key={h} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {decisions.map((row) => (
            <tr
              key={row.id}
              className={
                row.policy_passed
                  ? row.fallback
                    ? "text-gray-500"
                    : ""
                  : "bg-red-50"
              }
            >
              <td className="table-cell font-mono">
                {link ? (
                  <Link
                    to="/decisions/$decisionId"
                    params={{ decisionId: row.id }}
                    className="text-indigo-600"
                  >
                    {row.id.slice(0, 8)}
                  </Link>
                ) : (
                  row.id.slice(0, 8)
                )}
              </td>
              <td className="table-cell font-mono">{row.element_key}</td>
              <td className="table-cell">{row.subject_id}</td>
              <td className="table-cell">
                <ModeBadge mode={row.mode} />
              </td>
              <td className="table-cell">{String(row.fallback)}</td>
              <td className="table-cell">{String(row.policy_passed)}</td>
              <td className="table-cell">{formatDate(row.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheckboxGrid({
  title,
  form,
  prefix,
  names = fields,
}: {
  title: string;
  form: ReturnType<typeof useForm<Policy>>;
  prefix: keyof Policy;
  names?: string[];
}) {
  return (
    <div>
      <div className="field-label mb-2">{title}</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {names.map((name) => (
          <label
            key={name}
            className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              {...form.register(`${prefix}.${name}` as never)}
            />
            {name}
          </label>
        ))}
      </div>
    </div>
  );
}

function JsonEditor({
  title,
  value,
  onChange,
  compact = false,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <label className="block">
      <span className="field-label">{title}</span>
      <textarea
        className={`mt-2 w-full rounded-md border border-gray-300 bg-white p-3 font-mono text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${compact ? "h-40" : "h-80"}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TraitList({ traits }: { traits: Record<string, unknown> }) {
  const active = Object.entries(traits)
    .filter(([, value]) => value === true)
    .map(([key]) => key);
  return (
    <div className="flex flex-wrap gap-2">
      {active.length ? (
        active.map((trait) => <TraitTag key={trait} trait={trait} />)
      ) : (
        <span className="text-sm text-gray-400">none</span>
      )}
    </div>
  );
}

function ScoreList({ scores }: { scores: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      {[
        "misclick_score",
        "hesitation_score",
        "frustration_score",
        "guidance_need",
      ].map((key) => {
        const value = Number(scores[key] ?? 0);
        return (
          <div key={key}>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{key}</span>
              <span>{value.toFixed(2)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-indigo-600"
                style={{ width: `${Math.min(value, 1) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "";
}

function maskMiddle(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

const rootRoute = createRootRoute({ component: RootLayout });
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: () => <AuthPage mode="login" />,
});
const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: () => <AuthPage mode="signup" />,
});
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});
const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: ProjectsPage,
});
const elementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/elements",
  component: ElementsPage,
});
const elementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/elements/$elementKey",
  component: ElementDetailPage,
});
const profilesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profiles",
  component: ProfilesPage,
});
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profiles/$subjectId",
  component: ProfileDetailPage,
});
const decisionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/decisions",
  component: DecisionsPage,
});
const decisionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/decisions/$decisionId",
  component: DecisionDetailPage,
});
const policiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/policies",
  component: PoliciesPage,
});
const designRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/design-system",
  component: DesignSystemPage,
});
const playgroundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/playground",
  component: PlaygroundPage,
});
const demoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/demo",
  component: DemoPage,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});
const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account",
  component: AccountPage,
});
const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs",
  component: DocsPage,
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  dashboardRoute,
  projectsRoute,
  elementsRoute,
  elementRoute,
  profilesRoute,
  profileRoute,
  decisionsRoute,
  decisionRoute,
  policiesRoute,
  designRoute,
  playgroundRoute,
  demoRoute,
  settingsRoute,
  accountRoute,
  docsRoute,
]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
