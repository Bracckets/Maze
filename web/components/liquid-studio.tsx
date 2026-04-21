"use client";

import { Fragment, startTransition, useDeferredValue, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { Tag } from "@/components/ui";
import type {
  LiquidBundleResolve,
  LiquidIntegrationStatus,
  LiquidKeyDetail,
  LiquidKeySummary,
  LiquidProfile,
  LiquidTraitDefinition,
} from "@/lib/service-gateway";

type Props = {
  initialKeys: LiquidKeySummary[];
  initialKeyDetails: LiquidKeyDetail[];
  initialProfiles: LiquidProfile[];
  initialTraits: LiquidTraitDefinition[];
  observedScreens: string[];
  initialIntegrationStatus: LiquidIntegrationStatus;
};

type LiquidTab = "keys" | "profiles" | "variants" | "traits" | "staging" | "insights" | "rules" | "analytics";
type EntityPanelMode = "closed" | "create" | "edit" | "delete";

type KeyDraft = {
  id: string | null;
  key: string;
  screenKey: string;
  defaultText: string;
  locale: string;
  enabled: boolean;
};

type TraitDraft = {
  id: string | null;
  traitKey: string;
  label: string;
  description: string;
  valueType: "text" | "int" | "range" | "boolean" | "select";
  sourceType: "app_profile" | "maze_computed" | "manual_test";
  sourceKey: string;
  exampleValues: string;
  enabled: boolean;
};

type TraitValueType = TraitDraft["valueType"];

type ProfileDraftRow = {
  traitKey: string;
  valueType: TraitValueType;
  value: string;
  intValue: string;
  minValue: string;
  maxValue: string;
  boolValue: "" | "true" | "false";
};

type ProfileDraft = {
  id: string | null;
  profileKey: string;
  name: string;
  description: string;
  enabled: boolean;
  traits: ProfileDraftRow[];
};

type VariantDraft = {
  id: string | null;
  keyId: string;
  profileId: string;
  locale: string;
  text: string;
  enabled: boolean;
};

type PreviewState = {
  detail: LiquidKeyDetail | null;
  profileId: string | null;
  result: LiquidBundleResolve | null;
  busy: boolean;
  error: string | null;
};

type KeyMetric = {
  keyId: string;
  key: string;
  screen: string;
  exposures: number;
  defaultRate: number;
  liquidRate: number;
  lift: number;
  winner: string;
};

type ProfileShare = {
  id: string;
  label: string;
  value: number;
  tone: string;
};

type TraitComposerState = {
  targetProfileId: string | "create";
  traitKey: string;
  row: ProfileDraftRow;
  replaceIndex: number | null;
  originalRow: ProfileDraftRow | null;
};

type SelectOption = {
  value: string;
  label: string;
};

const TABS: Array<{ id: LiquidTab; label: string; icon: "key" | "profile" | "variant" | "trait" | "staging" | "insight" }> = [
  { id: "keys", label: "Keys", icon: "key" },
  { id: "profiles", label: "Profiles", icon: "profile" },
  { id: "variants", label: "Variants", icon: "variant" },
  { id: "traits", label: "Traits", icon: "trait" },
  { id: "staging", label: "Staging", icon: "staging" },
  { id: "insights", label: "Insights", icon: "insight" },
];

const TAB_DESCRIPTIONS: Record<LiquidTab, string> = {
  keys: "Create fallback copy and anchor every key to a screen users already visit.",
  profiles: "Browse and tune saved audiences without losing sight of readiness or attached traits.",
  variants: "See how fallback copy branches into profile-specific overrides for every key.",
  traits: "Define reusable profile signals, coverage, and source-of-truth mapping.",
  staging: "Inspect draft versus live state before you push personalized copy into production.",
  insights: "Watch coverage, fallback share, and modeled lift across every Liquid key.",
  rules: "Define reusable audience logic with traits, profiles, and profile-specific variants.",
  analytics: "Watch coverage, fallback share, and modeled lift across every Liquid key.",
};

const PROFILE_COLORS = ["#57ff2c", "#459dff", "#f4d06f", "#bf9bff", "#ff9f8e"];
const TRAIT_VALUE_TYPES: Array<{ value: TraitValueType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "int", label: "Integer" },
  { value: "range", label: "Range" },
  { value: "boolean", label: "Boolean" },
  { value: "select", label: "Select" },
];

const TRAIT_SOURCE_OPTIONS: Array<{ value: TraitDraft["sourceType"]; label: string }> = [
  { value: "app_profile", label: "App profile" },
  { value: "manual_test", label: "Manual test" },
];

const BOOLEAN_OPTIONS: SelectOption[] = [
  { value: "true", label: "True" },
  { value: "false", label: "False" },
];

function emptyKeyDraft(screenKey = ""): KeyDraft {
  return { id: null, key: "", screenKey, defaultText: "", locale: "en", enabled: true };
}

function emptyTraitDraft(): TraitDraft {
  return {
    id: null,
    traitKey: "",
    label: "",
    description: "",
    valueType: "text",
    sourceType: "app_profile",
    sourceKey: "",
    exampleValues: "",
    enabled: true,
  };
}

function emptyProfileDraft(): ProfileDraft {
  return { id: null, profileKey: "", name: "", description: "", enabled: true, traits: [] };
}

function emptyProfileDraftRow(valueType: TraitValueType = "text"): ProfileDraftRow {
  return { traitKey: "", valueType, value: "", intValue: "", minValue: "", maxValue: "", boolValue: "" };
}

function emptyVariantDraft(keyId = "", profileId = "", locale = "en"): VariantDraft {
  return { id: null, keyId, profileId, locale, text: "", enabled: true };
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function readError(payload: unknown, raw: string, status: number) {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
  }
  return raw.trim() || `Request failed with status ${status}.`;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const raw = await response.text();
  const payload = raw ? safeJsonParse(raw) : null;
  if (!response.ok) {
    throw new Error(readError(payload, raw, response.status));
  }
  return (payload ?? ({} as T)) as T;
}

function formatDate(value?: string | null) {
  if (!value) return "Not yet published";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

function keyState(detail: LiquidKeyDetail | null) {
  if (!detail) return "Draft";
  if (!detail.enabled && detail.publishedRevision > 0) return "Paused";
  if (!detail.enabled) return "Archived";
  if (detail.publishedRevision > 0) return "Live";
  return "Draft";
}

function keyStateTone(state: string): "accent" | "green" | "amber" | "red" | "default" {
  if (state === "Live") return "green";
  if (state === "Paused") return "amber";
  if (state === "Archived") return "red";
  return "accent";
}

function readinessTone(state?: string | null): "accent" | "green" | "amber" | "red" | "default" {
  if (state === "ready") return "green";
  if (state === "fallback_only" || state === "low_coverage") return "amber";
  if (state === "missing_source" || state === "test_only") return "red";
  return "default";
}

function readinessLabel(state?: string | null) {
  if (!state) return "Unknown";
  if (state === "fallback_only") return "Fallback only";
  if (state === "missing_source") return "Missing source";
  if (state === "test_only") return "Test-only";
  if (state === "low_coverage") return "Low coverage";
  return "Ready";
}

function traitSourceLabel(sourceType: LiquidTraitDefinition["sourceType"]) {
  if (sourceType === "maze_computed") return "Pollex computed";
  if (sourceType === "manual_test") return "Manual test";
  return "App profile";
}

function isSystemTrait(trait: LiquidTraitDefinition | null | undefined) {
  return trait?.sourceType === "maze_computed";
}

function titleFromKey(key: string) {
  const normalized = key.replace(/[._/-]+/g, " ").trim();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : key;
}

function getDraftDefaultVariant(detail: LiquidKeyDetail | null, locale?: string) {
  if (!detail) return null;
  return detail.variants.find(
    (variant) =>
      variant.stage === "draft" &&
      variant.isDefault &&
      !variant.segmentId &&
      !variant.ruleId &&
      !variant.experimentId &&
      (!locale || variant.locale === locale),
  ) ?? null;
}

function getPublishedDefaultVariant(detail: LiquidKeyDetail | null) {
  if (!detail) return null;
  return detail.variants.find(
    (variant) =>
      variant.stage === "published" &&
      variant.isDefault &&
      !variant.segmentId &&
      !variant.ruleId &&
      !variant.experimentId,
  ) ?? null;
}

function getScreenKey(detail: LiquidKeyDetail | null) {
  return detail?.bundles[0]?.screenKey ?? "";
}

function getLocaleCount(detail: LiquidKeyDetail | null) {
  if (!detail) return 0;
  const locales = new Set(detail.variants.map((variant) => variant.locale ?? detail.defaultLocale).filter(Boolean));
  return locales.size;
}

function getProfileVariant(detail: LiquidKeyDetail | null, profileId: string | null) {
  if (!detail || !profileId) return null;
  return detail.variants.find((variant) => variant.stage === "draft" && variant.segmentId === profileId) ?? null;
}

function keySummaryFromDetail(detail: LiquidKeyDetail): LiquidKeySummary {
  const draftVariantCount = detail.variants.filter((variant) => variant.stage === "draft").length;
  const publishedVariantCount = detail.variants.filter((variant) => variant.stage === "published").length;
  return {
    id: detail.id,
    key: detail.key,
    label: detail.label,
    description: detail.description,
    namespace: detail.namespace,
    defaultLocale: detail.defaultLocale,
    enabled: detail.enabled,
    draftVariantCount,
    publishedVariantCount,
    bundleCount: detail.bundles.length,
    publishedRevision: detail.publishedRevision,
    publishedAt: detail.publishedAt,
    dependencyCount: detail.dependencyCount,
    readiness: detail.readiness,
    updatedAt: detail.draftUpdatedAt,
  };
}

function buildKeyDraft(detail: LiquidKeyDetail | null, observedScreens: string[]) {
  if (!detail) return emptyKeyDraft(observedScreens[0] ?? "");
  return {
    id: detail.id,
    key: detail.key,
    screenKey: getScreenKey(detail) || observedScreens[0] || "",
    defaultText: getDraftDefaultVariant(detail)?.content.text ?? "",
    locale: detail.defaultLocale,
    enabled: detail.enabled,
  };
}

function buildTraitDraft(trait: LiquidTraitDefinition | null) {
  if (!trait) return emptyTraitDraft();
  return {
    id: trait.id,
    traitKey: trait.traitKey,
    label: trait.label,
    description: trait.description ?? "",
    valueType: trait.valueType,
    sourceType: trait.sourceType,
    sourceKey: trait.sourceKey ?? "",
    exampleValues: trait.exampleValues.join(", "),
    enabled: trait.enabled,
  };
}

function buildProfileDraft(profile: LiquidProfile | null): ProfileDraft {
  if (!profile) return emptyProfileDraft();
  return {
    id: profile.id,
    profileKey: profile.profileKey,
    name: profile.name,
    description: profile.description ?? "",
    enabled: profile.enabled,
    traits: profile.traits.map((trait) => ({
      traitKey: trait.traitKey,
      valueType: trait.valueType,
      value: trait.value ?? "",
      intValue: trait.intValue == null ? "" : String(trait.intValue),
      minValue: trait.minValue == null ? "" : String(trait.minValue),
      maxValue: trait.maxValue == null ? "" : String(trait.maxValue),
      boolValue: trait.boolValue == null ? "" : trait.boolValue ? "true" : "false",
    })),
  };
}

function formatProfileTraitDisplayValue(trait: LiquidProfile["traits"][number]) {
  return trait.displayValue || trait.value || "No value";
}

function hasDraftProfileTraitValue(row: ProfileDraftRow) {
  return Boolean(
    row.traitKey.trim() ||
      row.value.trim() ||
      row.intValue.trim() ||
      row.minValue.trim() ||
      row.maxValue.trim() ||
      row.boolValue,
  );
}

function buildProfileTraitRowForTrait(trait: LiquidTraitDefinition, existingRow?: ProfileDraftRow | null) {
  return existingRow
    ? { ...existingRow, traitKey: trait.traitKey, valueType: trait.valueType }
    : { ...emptyProfileDraftRow(trait.valueType), traitKey: trait.traitKey, valueType: trait.valueType };
}

function normalizeKeyDraftValue(draft: KeyDraft) {
  return {
    id: draft.id,
    key: draft.key.trim(),
    screenKey: draft.screenKey,
    defaultText: draft.defaultText,
    locale: draft.locale.trim(),
    enabled: draft.enabled,
  };
}

function normalizeTraitDraftValue(draft: TraitDraft) {
  return {
    id: draft.id,
    traitKey: draft.traitKey.trim(),
    label: draft.label.trim(),
    description: draft.description.trim(),
    valueType: draft.valueType,
    sourceType: draft.sourceType,
    sourceKey: draft.sourceKey.trim(),
    exampleValues: draft.exampleValues
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    enabled: draft.enabled,
  };
}

function normalizeProfileDraftRowValue(row: ProfileDraftRow) {
  return {
    traitKey: row.traitKey.trim(),
    valueType: row.valueType,
    value: row.value.trim(),
    intValue: row.intValue.trim(),
    minValue: row.minValue.trim(),
    maxValue: row.maxValue.trim(),
    boolValue: row.boolValue,
  };
}

function normalizeProfileDraftValue(draft: ProfileDraft) {
  return {
    id: draft.id,
    profileKey: draft.profileKey.trim(),
    name: draft.name.trim(),
    description: draft.description.trim(),
    enabled: draft.enabled,
    traits: draft.traits.map(normalizeProfileDraftRowValue),
  };
}

function normalizeVariantDraftValue(draft: VariantDraft) {
  return {
    id: draft.id,
    keyId: draft.keyId,
    profileId: draft.profileId,
    locale: draft.locale.trim(),
    text: draft.text,
    enabled: draft.enabled,
  };
}

function hasMeaningfulVariantDraft(draft: VariantDraft) {
  return Boolean(draft.keyId || draft.profileId || draft.text.trim());
}

function isCompleteVariantDraft(draft: VariantDraft) {
  return Boolean(draft.keyId && draft.profileId && draft.text.trim());
}

function buildVariantDraft(detail: LiquidKeyDetail | null, profileId: string | null): VariantDraft {
  const variant = getProfileVariant(detail, profileId);
  if (!detail) return emptyVariantDraft("", profileId ?? "", "en");
  return {
    id: variant?.id ?? null,
    keyId: detail.id,
    profileId: profileId ?? "",
    locale: variant?.locale ?? detail.defaultLocale,
    text: variant?.content.text ?? "",
    enabled: variant?.enabled ?? true,
  };
}

function analyticsRows(keys: LiquidKeySummary[], details: Record<string, LiquidKeyDetail>, profiles: LiquidProfile[]): KeyMetric[] {
  return keys.map((key, index) => {
    const detail = details[key.id] ?? null;
    const variantCount = detail?.variants.filter((variant) => variant.stage === "draft" && variant.segmentId).length ?? 0;
    const exposures = 1600 + index * 280 + variantCount * 145;
    const defaultRate = 18 + (index % 4) * 1.6;
    const liquidRate = defaultRate + (variantCount > 0 ? 3.1 + (profiles.length % 3) * 0.7 : 0.8);
    return {
      keyId: key.id,
      key: key.key,
      screen: getScreenKey(detail) || "Unassigned",
      exposures,
      defaultRate,
      liquidRate,
      lift: liquidRate - defaultRate,
      winner: variantCount > 0 ? "Profile variant" : "Fallback copy",
    };
  });
}

function profileShares(profiles: LiquidProfile[], details: Record<string, LiquidKeyDetail>): ProfileShare[] {
  if (profiles.length === 0) {
    return [{ id: "fallback", label: "Fallback only", value: 100, tone: PROFILE_COLORS[0] }];
  }
  const totalMappedVariants = Object.values(details).reduce((count, detail) => {
    return count + detail.variants.filter((variant) => variant.stage === "draft" && variant.segmentId).length;
  }, 0);
  const values = profiles.map((profile, index) => ({
    id: profile.id,
    label: profile.name,
    value: Math.max(8, 16 + index * 7 + totalMappedVariants * 3),
    tone: PROFILE_COLORS[index % PROFILE_COLORS.length],
  }));
  const total = values.reduce((sum, item) => sum + item.value, 0);
  return values.map((item) => ({ ...item, value: Math.round((item.value / total) * 100) }));
}

function profileAccent(profileId: string) {
  let hash = 0;
  for (const character of profileId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return PROFILE_COLORS[hash % PROFILE_COLORS.length];
}

function profileMonogram(name: string, profileKey = "") {
  const source = (name.trim() || profileKey.trim() || "Profile")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2);
  const letters = source.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return letters || "PR";
}

function PieChart({ shares }: { shares: ProfileShare[] }) {
  const stops: string[] = [];
  let current = 0;
  for (const share of shares) {
    const next = current + share.value;
    stops.push(`${share.tone} ${current}% ${next}%`);
    current = next;
  }
  return <div className="liquid-ops-pie" style={{ background: `conic-gradient(${stops.join(", ")})` }} aria-label="User profile distribution" />;
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="liquid-ops-empty">
      <div className="heading">{title}</div>
      <p className="panel-copy">{body}</p>
      {action ? <div className="liquid-ops-empty-action">{action}</div> : null}
    </div>
  );
}

function SectionTitle({ title, body, eyebrow }: { title: string; body?: string; eyebrow?: string }) {
  return (
    <div className="liquid-ops-section-title">
      {eyebrow ? <span>{eyebrow}</span> : null}
      <div className="heading">{title}</div>
      {body ? <p className="panel-copy">{body}</p> : null}
    </div>
  );
}

function LiquidSelect({
  value,
  options,
  onChange,
  placeholder = "Choose option",
  disabled = false,
  compact = false,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <div
      className={`surface-select liquid-ops-select ${compact ? "liquid-ops-select-compact" : ""}`.trim()}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`surface-select-trigger liquid-ops-select-trigger ${isOpen ? "open" : ""}`.trim()}
        disabled={disabled}
        type="button"
        onClick={() => {
          if (!disabled) setIsOpen((open) => !open);
        }}
      >
        <span className="surface-select-value">{selected?.label ?? placeholder}</span>
        <span className="surface-select-chevron" aria-hidden="true">▾</span>
      </button>
      {isOpen ? (
        <div className="surface-select-popover liquid-ops-select-popover" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              className={`surface-select-option ${option.value === value ? "active" : ""}`.trim()}
              role="option"
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProfileTraitValueInput({
  row,
  trait,
  onChange,
}: {
  row: ProfileDraftRow;
  trait: LiquidTraitDefinition | null;
  onChange: (patch: Partial<ProfileDraftRow>) => void;
}) {
  const valueType = trait?.valueType ?? row.valueType;
  const selectOptions = (trait?.exampleValues ?? [])
    .filter(Boolean)
    .map((value) => ({ value, label: value }));
  if (!row.traitKey) {
    return <input className="liquid-ops-input liquid-ops-table-input" placeholder="Choose a trait first" disabled />;
  }
  if (valueType === "range") {
    return (
      <div className="liquid-ops-inline-trait-range">
        <input
          className="liquid-ops-input liquid-ops-table-input"
          inputMode="decimal"
          value={row.minValue}
          onChange={(event) => onChange({ minValue: event.target.value })}
          placeholder="Min"
        />
        <input
          className="liquid-ops-input liquid-ops-table-input"
          inputMode="decimal"
          value={row.maxValue}
          onChange={(event) => onChange({ maxValue: event.target.value })}
          placeholder="Max"
        />
      </div>
    );
  }
  if (valueType === "boolean") {
    return (
      <LiquidSelect
        compact
        value={row.boolValue}
        options={BOOLEAN_OPTIONS}
        placeholder="True or false"
        onChange={(nextValue) => onChange({ boolValue: nextValue as ProfileDraftRow["boolValue"] })}
      />
    );
  }
  if (valueType === "int") {
    return (
      <input
        className="liquid-ops-input liquid-ops-table-input"
        inputMode="numeric"
        value={row.intValue}
        onChange={(event) => onChange({ intValue: event.target.value })}
        placeholder="42"
      />
    );
  }
  if (valueType === "select") {
    return (
      <LiquidSelect
        compact
        value={row.value}
        options={selectOptions}
        placeholder={trait?.sourceType === "maze_computed" ? "Choose computed value" : "Choose option"}
        onChange={(nextValue) => onChange({ value: nextValue })}
        disabled={selectOptions.length === 0}
      />
    );
  }
  return (
    <input
      className="liquid-ops-input liquid-ops-table-input"
      value={row.value}
      onChange={(event) => onChange({ value: event.target.value })}
      placeholder={trait?.sourceType === "maze_computed" ? "Computed value is fixed by Pollex" : "Value"}
      disabled={trait?.sourceType === "maze_computed"}
    />
  );
}

export function LiquidStudio({
  initialKeys,
  initialKeyDetails,
  initialProfiles,
  initialTraits,
  observedScreens,
  initialIntegrationStatus,
}: Props) {
  const sortedObservedScreens = [...observedScreens].sort((a, b) => a.localeCompare(b));
  const [activeTab, setActiveTab] = useState<LiquidTab>("keys");
  const [keys, setKeys] = useState(initialKeys);
  const [detailsById, setDetailsById] = useState<Record<string, LiquidKeyDetail>>(
    () => Object.fromEntries(initialKeyDetails.map((detail) => [detail.id, detail])) as Record<string, LiquidKeyDetail>,
  );
  const [profiles, setProfiles] = useState(initialProfiles);
  const [traits, setTraits] = useState(initialTraits);
  const [integrationStatus, setIntegrationStatus] = useState(initialIntegrationStatus);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedTraitId, setSelectedTraitId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [rulesTab, setRulesTab] = useState<"profiles" | "traits" | "variants">("profiles");
  const [keyPanelMode, setKeyPanelMode] = useState<EntityPanelMode>("closed");
  const [profilePanelMode, setProfilePanelMode] = useState<EntityPanelMode>("closed");
  const [traitPanelMode, setTraitPanelMode] = useState<EntityPanelMode>("closed");
  const [variantPanelMode, setVariantPanelMode] = useState<EntityPanelMode>("closed");
  const [keyMode, setKeyMode] = useState<"create" | "edit">("edit");
  const [traitMode, setTraitMode] = useState<"create" | "edit">("edit");
  const [profileMode, setProfileMode] = useState<"create" | "edit">("edit");
  const [variantMode, setVariantMode] = useState<"create" | "edit">("edit");
  const [keySearch, setKeySearch] = useState("");
  const [insightsSearch, setInsightsSearch] = useState("");
  const analyticsSearch = insightsSearch;
  const setAnalyticsSearch = setInsightsSearch;
  const [keyDraft, setKeyDraft] = useState<KeyDraft>(emptyKeyDraft(sortedObservedScreens[0] ?? ""));
  const [traitDraft, setTraitDraft] = useState<TraitDraft>(emptyTraitDraft());
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(emptyProfileDraft());
  const [variantDraft, setVariantDraft] = useState<VariantDraft>(emptyVariantDraft("", "", initialKeyDetails[0]?.defaultLocale ?? "en"));
  const [draggedTraitKey, setDraggedTraitKey] = useState<string | null>(null);
  const [profileDropTarget, setProfileDropTarget] = useState<string | "create" | null>(null);
  const [traitComposer, setTraitComposer] = useState<TraitComposerState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>({
    detail: null,
    profileId: null,
    result: null,
    busy: false,
    error: null,
  });
  const deferredKeySearch = useDeferredValue(keySearch);
  const deferredInsightsSearch = useDeferredValue(insightsSearch);

  const activeKeyId = selectedKeyId && keys.some((key) => key.id === selectedKeyId) ? selectedKeyId : null;
  const activeProfileId = selectedProfileId && profiles.some((profile) => profile.id === selectedProfileId) ? selectedProfileId : null;
  const activeTraitId = selectedTraitId && traits.some((trait) => trait.id === selectedTraitId) ? selectedTraitId : null;

  const selectedKeyDetail = activeKeyId ? detailsById[activeKeyId] ?? null : null;
  const selectedProfile = activeProfileId ? profiles.find((profile) => profile.id === activeProfileId) ?? null : null;
  const selectedTrait = activeTraitId ? traits.find((trait) => trait.id === activeTraitId) ?? null : null;

  const filteredKeys = keys.filter((key) => {
    const detail = detailsById[key.id] ?? null;
    const query = deferredKeySearch.trim().toLowerCase();
    if (!query) return true;
    return [key.key, getScreenKey(detail), getDraftDefaultVariant(detail)?.content.text ?? ""].join(" ").toLowerCase().includes(query);
  });

  const metricRows = analyticsRows(keys, detailsById, profiles).filter((row) => {
    const query = deferredInsightsSearch.trim().toLowerCase();
    if (!query) return true;
    return [row.key, row.screen].join(" ").toLowerCase().includes(query);
  });
  const shares = profileShares(profiles, detailsById);
  const winners = [...metricRows].sort((a, b) => b.lift - a.lift).slice(0, 3);
  const underperformers = [...metricRows].sort((a, b) => a.lift - b.lift).slice(0, 3);
  const observedScreenOptions = sortedObservedScreens.map((screen) => ({ value: screen, label: screen }));
  const keyStatusOptions: SelectOption[] = [
    { value: "active", label: "Active" },
    { value: "archived", label: "Archived" },
  ];
  const readyStatusOptions: SelectOption[] = [
    { value: "ready", label: "Draft ready" },
    { value: "paused", label: "Paused" },
  ];
  const activeStatusOptions: SelectOption[] = [
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
  ];
  const traitDefinitionByKey = new Map(traits.map((trait) => [trait.traitKey, trait]));
  const keyOptions = keys.map((key) => ({ value: key.id, label: key.key }));
  const profileOptions = profiles.map((profile) => ({ value: profile.id, label: profile.name }));
  const liveKeyCount = keys.filter((key) => keyState(detailsById[key.id] ?? null) === "Live").length;
  const readyProfileCount = profiles.filter((profile) => profile.readiness?.state === "ready").length;
  const variantCount = Object.values(detailsById).reduce(
    (count, detail) => count + detail.variants.filter((variant) => variant.stage === "draft" && variant.segmentId).length,
    0,
  );
  const flatVariants = keys.flatMap((key) => {
    const detail = detailsById[key.id] ?? null;
    return (detail?.variants.filter((variant) => variant.stage === "draft" && variant.segmentId) ?? []).map((variant) => ({
      key,
      detail,
      variant,
      profile: profiles.find((profile) => profile.id === variant.segmentId) ?? null,
    }));
  });
  const keyDraftBaseline = keyMode === "create" ? emptyKeyDraft(sortedObservedScreens[0] ?? "") : buildKeyDraft(selectedKeyDetail, sortedObservedScreens);
  const traitDraftBaseline = traitMode === "create" ? emptyTraitDraft() : buildTraitDraft(selectedTrait);
  const profileDraftBaseline = profileMode === "create" ? emptyProfileDraft() : buildProfileDraft(selectedProfile);
  const variantDraftBaseline =
    variantMode === "create"
      ? emptyVariantDraft(activeKeyId ?? "", activeProfileId ?? "", selectedKeyDetail?.defaultLocale ?? "en")
      : buildVariantDraft(selectedKeyDetail, activeProfileId);

  function clearMessages() {
    setNotice(null);
    setError(null);
  }

  function isKeyDraftDirty() {
    return JSON.stringify(normalizeKeyDraftValue(keyDraft)) !== JSON.stringify(normalizeKeyDraftValue(keyDraftBaseline));
  }

  function isTraitDraftDirty() {
    return JSON.stringify(normalizeTraitDraftValue(traitDraft)) !== JSON.stringify(normalizeTraitDraftValue(traitDraftBaseline));
  }

  function isProfileDraftDirty(draft: ProfileDraft = profileDraft) {
    return JSON.stringify(normalizeProfileDraftValue(draft)) !== JSON.stringify(normalizeProfileDraftValue(profileDraftBaseline));
  }

  function isVariantDraftDirty() {
    return JSON.stringify(normalizeVariantDraftValue(variantDraft)) !== JSON.stringify(normalizeVariantDraftValue(variantDraftBaseline));
  }

  function isTraitComposerDirty() {
    if (!traitComposer) return false;
    if (!traitComposer.originalRow) return hasDraftProfileTraitValue(traitComposer.row);
    return JSON.stringify(normalizeProfileDraftRowValue(traitComposer.row)) !== JSON.stringify(normalizeProfileDraftRowValue(traitComposer.originalRow));
  }

  function resetTraitDragState() {
    setDraggedTraitKey(null);
    setProfileDropTarget(null);
  }

  function selectKey(keyId: string | null, nextMode: "create" | "edit" = "edit") {
    setSelectedKeyId(keyId);
    setKeyMode(nextMode);
    setKeyDraft(nextMode === "create" ? emptyKeyDraft(sortedObservedScreens[0] ?? "") : buildKeyDraft(keyId ? detailsById[keyId] ?? null : null, sortedObservedScreens));
  }

  function selectTrait(traitId: string | null) {
    setSelectedTraitId(traitId);
    setTraitMode(traitId ? "edit" : "create");
    const trait = traitId ? traits.find((item) => item.id === traitId) ?? null : null;
    setTraitDraft(buildTraitDraft(trait));
  }

  function selectProfile(profileId: string | null) {
    setSelectedProfileId(profileId);
    setProfileMode(profileId ? "edit" : "create");
    const profile = profileId ? profiles.find((item) => item.id === profileId) ?? null : null;
    setProfileDraft(buildProfileDraft(profile));
    setTraitComposer(null);
    resetTraitDragState();
  }

  function closeProfileEditor() {
    setSelectedProfileId(null);
    setProfileMode("edit");
    setProfileDraft(emptyProfileDraft());
    setTraitComposer(null);
    resetTraitDragState();
  }

  function openTraitComposerForTarget(targetProfileId: string | "create", traitKey: string) {
    const definition = traitDefinitionByKey.get(traitKey);
    if (!definition) {
      setError("Create the trait first before using it on a profile.");
      resetTraitDragState();
      return;
    }
    if (targetProfileId === "create") {
      const createDraft = profileMode === "create" ? profileDraft : emptyProfileDraft();
      const existingIndex = createDraft.traits.findIndex((item) => item.traitKey === traitKey);
      setSelectedProfileId(null);
      setProfileMode("create");
      setProfileDraft(createDraft);
      setTraitComposer({
        targetProfileId,
        traitKey,
        row: buildProfileTraitRowForTrait(definition, existingIndex >= 0 ? createDraft.traits[existingIndex] : null),
        replaceIndex: existingIndex >= 0 ? existingIndex : null,
        originalRow: existingIndex >= 0 ? createDraft.traits[existingIndex] : null,
      });
      resetTraitDragState();
      return;
    }
    const profile = profiles.find((item) => item.id === targetProfileId) ?? null;
    if (!profile) {
      setError("This profile could not be found.");
      resetTraitDragState();
      return;
    }
    const nextDraft = activeProfileId === profile.id && profileMode === "edit" ? profileDraft : buildProfileDraft(profile);
    const existingIndex = nextDraft.traits.findIndex((item) => item.traitKey === traitKey);
    setSelectedProfileId(profile.id);
    setProfileMode("edit");
    setProfileDraft(nextDraft);
    setTraitComposer({
      targetProfileId,
      traitKey,
      row: buildProfileTraitRowForTrait(definition, existingIndex >= 0 ? nextDraft.traits[existingIndex] : null),
      replaceIndex: existingIndex >= 0 ? existingIndex : null,
      originalRow: existingIndex >= 0 ? nextDraft.traits[existingIndex] : null,
    });
    resetTraitDragState();
  }

  function buildProfileDraftWithComposer(draft: ProfileDraft, composer: TraitComposerState, definition: LiquidTraitDefinition) {
    const nextTraits = [...draft.traits];
    const nextRow = buildProfileTraitRowForTrait(definition, composer.row);
    if (composer.replaceIndex != null && nextTraits[composer.replaceIndex]) {
      nextTraits[composer.replaceIndex] = nextRow;
    } else {
      const duplicateIndex = nextTraits.findIndex((item) => item.traitKey === composer.traitKey);
      if (duplicateIndex >= 0) nextTraits[duplicateIndex] = nextRow;
      else nextTraits.push(nextRow);
    }
    return { ...draft, traits: nextTraits };
  }

  function saveTraitComposer() {
    if (!traitComposer) return profileDraft;
    const definition = traitDefinitionByKey.get(traitComposer.traitKey);
    if (!definition) {
      setError("This trait is no longer available.");
      return false;
    }
    try {
      if (!isTraitComposerDirty()) {
        setTraitComposer(null);
        clearMessages();
        return profileDraft;
      }
      buildProfileTraitPayload(traitComposer.row);
      const nextDraft = buildProfileDraftWithComposer(profileDraft, traitComposer, definition);
      setProfileDraft(nextDraft);
      setTraitComposer(null);
      clearMessages();
      return nextDraft;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not add this trait.");
      return false;
    }
  }

  function cancelTraitComposer() {
    setTraitComposer(null);
    resetTraitDragState();
  }

  function selectVariant(keyId: string | null, profileId: string | null, variantId: string | null = null) {
    const detail = keyId ? detailsById[keyId] ?? null : null;
    setSelectedKeyId(keyId);
    setSelectedProfileId(profileId);
    setSelectedVariantId(variantId);
    setVariantMode(variantId ? "edit" : "create");
    setVariantDraft(variantId ? buildVariantDraft(detail, profileId) : emptyVariantDraft(keyId ?? "", profileId ?? "", detail?.defaultLocale ?? "en"));
  }

  function resetVariantEditor(nextDraft?: VariantDraft) {
    setSelectedVariantId(null);
    setVariantMode("create");
    setVariantDraft(nextDraft ?? emptyVariantDraft(activeKeyId ?? "", activeProfileId ?? "", selectedKeyDetail?.defaultLocale ?? "en"));
  }

  function upsertKeyDetail(detail: LiquidKeyDetail) {
    setDetailsById((current) => ({ ...current, [detail.id]: detail }));
    setKeys((current) => {
      const nextSummary = keySummaryFromDetail(detail);
      const index = current.findIndex((item) => item.id === detail.id);
      if (index === -1) return [nextSummary, ...current];
      return current.map((item) => (item.id === detail.id ? nextSummary : item));
    });
    setSelectedKeyId(detail.id);
    setKeyDraft(buildKeyDraft(detail, sortedObservedScreens));
    setKeyMode("edit");
  }

  function buildProfileTraitPayload(row: ProfileDraftRow) {
    const traitKey = row.traitKey.trim();
    if (!traitKey) {
      if (hasDraftProfileTraitValue(row)) {
        throw new Error("Choose a trait before entering a profile value.");
      }
      return null;
    }
    const definition = traitDefinitionByKey.get(traitKey);
    if (!definition) {
      throw new Error(`Trait '${traitKey}' must be created before it can be used in a profile.`);
    }
    if (definition.valueType === "range") {
      const minValue = row.minValue.trim();
      const maxValue = row.maxValue.trim();
      if (!minValue || !maxValue) {
        throw new Error(`Trait '${definition.label}' needs both a minimum and maximum value.`);
      }
      const parsedMin = Number(minValue);
      const parsedMax = Number(maxValue);
      if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax)) {
        throw new Error(`Trait '${definition.label}' needs numeric range values.`);
      }
      if (parsedMin > parsedMax) {
        throw new Error(`Trait '${definition.label}' must use a minimum that is less than or equal to the maximum.`);
      }
      return { traitKey, minValue: parsedMin, maxValue: parsedMax };
    }
    if (definition.valueType === "boolean") {
      if (!row.boolValue) {
        throw new Error(`Trait '${definition.label}' must be set to true or false.`);
      }
      return { traitKey, boolValue: row.boolValue === "true" };
    }
    if (definition.valueType === "int") {
      const intValue = row.intValue.trim();
      if (!/^-?\d+$/.test(intValue)) {
        throw new Error(`Trait '${definition.label}' needs a whole number.`);
      }
      return { traitKey, intValue: Number(intValue) };
    }
    const value = row.value.trim();
    if (!value) {
      throw new Error(`Trait '${definition.label}' needs a value.`);
    }
    return { traitKey, value };
  }

  async function saveKey() {
    clearMessages();
    if (!keyDraft.key.trim()) {
      setError("Add a key name before saving.");
      return false;
    }
    if (sortedObservedScreens.length === 0) {
      setError("Liquid needs at least one observed Pollex screen before you can create keys.");
      return false;
    }
    if (!keyDraft.screenKey) {
      setError("Choose an observed screen for this key.");
      return false;
    }
    setBusy("key");
    try {
      const payload = {
        key: keyDraft.key.trim(),
        label: titleFromKey(keyDraft.key.trim()),
        description: null,
        namespace: null,
        defaultLocale: keyDraft.locale.trim() || "en",
        screenKey: keyDraft.screenKey,
        enabled: keyDraft.enabled,
      };
      if (keyMode === "create" || !keyDraft.id) {
        const detail = await requestJson<LiquidKeyDetail>("/api/liquid/keys", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            initialContent: { text: keyDraft.defaultText, icon: null, visibility: "visible", emphasis: "medium", ordering: 0 },
          }),
        });
        upsertKeyDetail(detail);
        setKeyMode("edit");
        setNotice("Key created and assigned to its observed screen.");
      } else {
        const detail = await requestJson<LiquidKeyDetail>(`/api/liquid/keys/${keyDraft.id}/draft`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        const existingDefault = getDraftDefaultVariant(detail, keyDraft.locale);
        const variantPayload = {
          locale: keyDraft.locale.trim() || "en",
          segmentId: null,
          ruleId: null,
          experimentId: null,
          experimentArm: null,
          trafficPercentage: 100,
          priority: 100,
          isDefault: true,
          enabled: keyDraft.enabled,
          content: { text: keyDraft.defaultText, icon: null, visibility: "visible", emphasis: "medium", ordering: 0 },
        };
        const updatedDetail = existingDefault
          ? await requestJson<LiquidKeyDetail>(`/api/liquid/variants/${existingDefault.id}`, { method: "PUT", body: JSON.stringify(variantPayload) })
          : await requestJson<LiquidKeyDetail>(`/api/liquid/keys/${detail.id}/variants`, { method: "POST", body: JSON.stringify(variantPayload) });
        upsertKeyDetail(updatedDetail);
        setNotice("Key details saved.");
      }
      return true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save this key.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function deleteKey() {
    if (!keyDraft.id) return;
    clearMessages();
    setBusy("key-delete");
    try {
      await requestJson(`/api/liquid/keys/${keyDraft.id}`, { method: "DELETE" });
      setKeys((current) => current.filter((item) => item.id !== keyDraft.id));
      setDetailsById((current) => {
        const next = { ...current };
        delete next[keyDraft.id as string];
        return next;
      });
      setSelectedKeyId(null);
      setKeyMode("create");
      setKeyDraft(emptyKeyDraft(sortedObservedScreens[0] ?? ""));
      setKeyPanelMode("closed");
      setNotice("Key removed.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete this key.");
    } finally {
      setBusy(null);
    }
  }

  async function saveTrait() {
    clearMessages();
    if (!traitDraft.traitKey.trim() || !traitDraft.label.trim()) {
      setError("Add both a trait key and label.");
      return false;
    }
    if (traitDraft.sourceType === "maze_computed") {
      setError("Pollex-computed traits are built in. Create an app or manual test trait instead.");
      return false;
    }
    setBusy("trait");
    try {
      const payload = {
        traitKey: traitDraft.traitKey.trim(),
        label: traitDraft.label.trim(),
        description: traitDraft.description.trim() || null,
        valueType: traitDraft.valueType,
        sourceType: traitDraft.sourceType,
        sourceKey: traitDraft.sourceKey.trim() || null,
        exampleValues: traitDraft.exampleValues
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        enabled: traitDraft.enabled,
      };
      const trait = traitDraft.id
        ? await requestJson<LiquidTraitDefinition>(`/api/liquid/traits/${traitDraft.id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await requestJson<LiquidTraitDefinition>("/api/liquid/traits", { method: "POST", body: JSON.stringify(payload) });
      setTraits((current) => {
        const exists = current.some((item) => item.id === trait.id);
        return exists ? current.map((item) => (item.id === trait.id ? trait : item)) : [trait, ...current];
      });
      setSelectedTraitId(trait.id);
      setTraitMode("edit");
      setNotice(traitDraft.id ? "Trait updated." : "Trait created.");
      return true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save this trait.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function deleteTrait() {
    if (!traitDraft.id) return;
    if (traitDraft.sourceType === "maze_computed") {
      setError("Pollex-computed traits are built in and cannot be deleted.");
      return;
    }
    clearMessages();
    setBusy("trait-delete");
    try {
      await requestJson(`/api/liquid/traits/${traitDraft.id}`, { method: "DELETE" });
      setTraits((current) => current.filter((item) => item.id !== traitDraft.id));
      setSelectedTraitId(null);
      setTraitMode("create");
      setTraitDraft(emptyTraitDraft());
      setTraitPanelMode("closed");
      setNotice("Trait removed.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete this trait.");
    } finally {
      setBusy(null);
    }
  }

  async function saveProfile(draftOverride?: ProfileDraft) {
    const nextDraft = draftOverride ?? profileDraft;
    clearMessages();
    if (!nextDraft.profileKey.trim() || !nextDraft.name.trim()) {
      setError("Add a profile key and profile name.");
      return false;
    }
    setBusy("profile");
    try {
      const traits = nextDraft.traits.reduce<Array<Record<string, unknown>>>((items, trait) => {
        const payload = buildProfileTraitPayload(trait);
        if (payload) items.push(payload);
        return items;
      }, []);
      const payload = {
        profileKey: nextDraft.profileKey.trim(),
        name: nextDraft.name.trim(),
        description: nextDraft.description.trim() || null,
        enabled: nextDraft.enabled,
        traits,
      };
      const profile = nextDraft.id
        ? await requestJson<LiquidProfile>(`/api/liquid/profiles/${nextDraft.id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await requestJson<LiquidProfile>("/api/liquid/profiles", { method: "POST", body: JSON.stringify(payload) });
      setProfiles((current) => {
        const exists = current.some((item) => item.id === profile.id);
        return exists ? current.map((item) => (item.id === profile.id ? profile : item)) : [profile, ...current];
      });
      setSelectedProfileId(profile.id);
      setProfileMode("edit");
      setTraitComposer(null);
      resetTraitDragState();
      setNotice(nextDraft.id ? "Profile updated." : "Profile created.");
      return true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save this profile.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function deleteProfile() {
    if (!profileDraft.id) return;
    clearMessages();
    setBusy("profile-delete");
    try {
      await requestJson(`/api/liquid/profiles/${profileDraft.id}`, { method: "DELETE" });
      setProfiles((current) => current.filter((item) => item.id !== profileDraft.id));
      setSelectedProfileId(null);
      setProfileMode("create");
      setProfileDraft(emptyProfileDraft());
      setTraitComposer(null);
      resetTraitDragState();
      setProfilePanelMode("closed");
      setNotice("Profile removed.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete this profile.");
    } finally {
      setBusy(null);
    }
  }

  async function saveVariant() {
    clearMessages();
    if (!variantDraft.keyId || !variantDraft.profileId || !variantDraft.text.trim()) {
      setError("Choose a key and profile, then add the resolved copy.");
      return false;
    }
    setBusy("variant");
    try {
      const payload = {
        locale: variantDraft.locale.trim() || "en",
        segmentId: variantDraft.profileId,
        ruleId: null,
        experimentId: null,
        experimentArm: null,
        trafficPercentage: 100,
        priority: 120,
        isDefault: false,
        enabled: variantDraft.enabled,
        content: { text: variantDraft.text, icon: null, visibility: "visible", emphasis: "medium", ordering: 0 },
      };
      const detail = variantDraft.id
        ? await requestJson<LiquidKeyDetail>(`/api/liquid/variants/${variantDraft.id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await requestJson<LiquidKeyDetail>(`/api/liquid/keys/${variantDraft.keyId}/variants`, { method: "POST", body: JSON.stringify(payload) });
      upsertKeyDetail(detail);
      const nextVariant = getProfileVariant(detail, variantDraft.profileId);
      setSelectedVariantId(nextVariant?.id ?? null);
      setVariantMode(nextVariant ? "edit" : "create");
      setNotice(variantDraft.id ? "Profile copy updated." : "Profile copy created.");
      return true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save this profile copy.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function deleteVariant() {
    if (!variantDraft.id) return;
    clearMessages();
    setBusy("variant-delete");
    try {
      const detail = await requestJson<LiquidKeyDetail>(`/api/liquid/variants/${variantDraft.id}`, { method: "DELETE" });
      upsertKeyDetail(detail);
      setSelectedVariantId(null);
      setVariantMode("create");
      setVariantDraft(buildVariantDraft(detail, activeProfileId));
      setVariantPanelMode("closed");
      setNotice("Profile copy removed.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete this profile copy.");
    } finally {
      setBusy(null);
    }
  }

  async function publishKey(keyId: string) {
    clearMessages();
    setBusy(`publish-${keyId}`);
    try {
      const detail = await requestJson<LiquidKeyDetail>(`/api/liquid/keys/${keyId}/publish`, { method: "POST" });
      upsertKeyDetail(detail);
      setNotice("Draft moved live.");
      void refreshIntegrationStatus();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not publish this key.");
    } finally {
      setBusy(null);
    }
  }

  async function demoteKey(keyId: string) {
    clearMessages();
    setBusy(`demote-${keyId}`);
    try {
      const detail = await requestJson<LiquidKeyDetail>(`/api/liquid/keys/${keyId}/demote`, { method: "POST" });
      upsertKeyDetail(detail);
      setNotice("Live copy moved back to draft.");
      void refreshIntegrationStatus();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not demote this key.");
    } finally {
      setBusy(null);
    }
  }

  async function refreshIntegrationStatus() {
    try {
      const status = await requestJson<LiquidIntegrationStatus>("/api/liquid/integration-status");
      setIntegrationStatus(status);
    } catch {
      // Keep the current status visible if the refresh fails.
    }
  }

  async function runPreview(detail: LiquidKeyDetail, profileId?: string | null) {
    const screenKey = getScreenKey(detail);
    if (!screenKey) {
      setPreviewState({ detail, profileId: profileId ?? null, result: null, busy: false, error: "Assign this key to an observed screen first." });
      return;
    }
    const profile = profileId ? profiles.find((item) => item.id === profileId) ?? null : null;
    const traitsPayload =
      profile?.traits.reduce<Record<string, string | number | boolean>>((carry, trait) => {
        if (trait.valueType === "range") {
          if (trait.minValue != null && trait.maxValue != null) carry[trait.traitKey] = (trait.minValue + trait.maxValue) / 2;
          else if (trait.minValue != null) carry[trait.traitKey] = trait.minValue;
          else if (trait.maxValue != null) carry[trait.traitKey] = trait.maxValue;
          return carry;
        }
        if (trait.intValue != null) carry[trait.traitKey] = trait.intValue;
        else if (trait.boolValue != null) carry[trait.traitKey] = trait.boolValue;
        else if (trait.value) carry[trait.traitKey] = trait.value;
        return carry;
      }, {}) ?? {};
    setPreviewState({ detail, profileId: profileId ?? null, result: null, busy: true, error: null });
    try {
      const result = await requestJson<LiquidBundleResolve>("/api/liquid/preview/bundles/resolve", {
        method: "POST",
        body: JSON.stringify({
          screenKey,
          locale: detail.defaultLocale,
          subjectId: "liquid-preview-user",
          traits: traitsPayload,
        }),
      });
      setPreviewState({ detail, profileId: profileId ?? null, result, busy: false, error: null });
      void refreshIntegrationStatus();
    } catch (nextError) {
      setPreviewState({
        detail,
        profileId: profileId ?? null,
        result: null,
        busy: false,
        error: nextError instanceof Error ? nextError.message : "Could not run preview.",
      });
    }
  }

  function updateProfileTrait(index: number, patch: Partial<ProfileDraftRow>) {
    setProfileDraft((current) => {
      const next = [...current.traits];
      next[index] = { ...next[index], ...patch };
      return { ...current, traits: next };
    });
  }

  function removeProfileTraitRow(index: number) {
    setProfileDraft((current) => ({ ...current, traits: current.traits.filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function requestActiveTabChange(nextTab: LiquidTab) {
    if (nextTab === activeTab) return;
    startTransition(() => setActiveTab(nextTab));
  }

  async function requestOpenKeyPanel(nextPanel: Exclude<EntityPanelMode, "closed">, keyId: string | null = null) {
    clearMessages();
    if (nextPanel === "create") selectKey(null, "create");
    else selectKey(keyId, "edit");
    setKeyPanelMode(nextPanel);
  }

  async function requestOpenTraitPanel(nextPanel: Exclude<EntityPanelMode, "closed">, traitId: string | null = null) {
    clearMessages();
    if (nextPanel === "create") selectTrait(null);
    else selectTrait(traitId);
    setTraitPanelMode(nextPanel);
  }

  async function requestOpenProfilePanel(nextPanel: Exclude<EntityPanelMode, "closed">, profileId: string | null = null) {
    clearMessages();
    if (nextPanel === "create") selectProfile(null);
    else selectProfile(profileId);
    setProfilePanelMode(nextPanel);
  }

  async function requestOpenVariantPanel(
    nextPanel: Exclude<EntityPanelMode, "closed">,
    keyId: string | null = activeKeyId ?? keys[0]?.id ?? null,
    profileId: string | null = activeProfileId ?? profiles[0]?.id ?? null,
    variantId: string | null = null,
  ) {
    clearMessages();
    selectVariant(keyId, profileId, nextPanel === "create" ? null : variantId);
    setVariantPanelMode(nextPanel);
  }

  async function requestCloseKeyPanel() {
    setSelectedKeyId(null);
    setKeyMode("edit");
    setKeyDraft(emptyKeyDraft(sortedObservedScreens[0] ?? ""));
    setKeyPanelMode("closed");
    clearMessages();
  }

  async function requestCloseProfilePanel() {
    closeProfileEditor();
    setProfilePanelMode("closed");
    clearMessages();
  }

  async function requestCloseTraitPanel() {
    setSelectedTraitId(null);
    setTraitMode("create");
    setTraitDraft(emptyTraitDraft());
    setTraitPanelMode("closed");
    clearMessages();
  }

  async function requestCloseVariantPanel() {
    resetVariantEditor();
    setVariantPanelMode("closed");
    clearMessages();
  }

  async function requestRulesTabChange(nextTab: "profiles" | "traits" | "variants") {
    setRulesTab(nextTab);
  }

  async function requestSelectKey(keyId: string | null, nextMode: "create" | "edit" = "edit") {
    return requestOpenKeyPanel(nextMode === "create" ? "create" : "edit", keyId);
  }

  async function requestSelectTrait(traitId: string | null) {
    return requestOpenTraitPanel(traitId ? "edit" : "create", traitId);
  }

  async function requestSelectProfile(profileId: string | null) {
    return requestOpenProfilePanel(profileId ? "edit" : "create", profileId);
  }

  async function requestSelectVariant(keyId: string | null, profileId: string | null, variantId: string | null = null) {
    return requestOpenVariantPanel(variantId ? "edit" : "create", keyId, profileId, variantId);
  }

  async function requestCloseKeyEditor() {
    return requestCloseKeyPanel();
  }

  async function requestCloseProfileEditor() {
    return requestCloseProfilePanel();
  }

  function draftProfileVariantRows() {
    return keys.flatMap((key) => {
      const detail = detailsById[key.id] ?? null;
      return (detail?.variants.filter((variant) => variant.stage === "draft" && variant.segmentId) ?? []).map((variant) => ({
        key,
        detail,
        variant,
        profile: profiles.find((profile) => profile.id === variant.segmentId) ?? null,
      }));
    });
  }

  function profileVariantCount(profileId: string) {
    return keys.reduce((count, key) => {
      const detail = detailsById[key.id] ?? null;
      return count + (detail?.variants.filter((variant) => variant.stage === "draft" && variant.segmentId === profileId).length ?? 0);
    }, 0);
  }

  function closeKeyEditor() {
    setSelectedKeyId(null);
    setKeyMode("edit");
    setKeyDraft(emptyKeyDraft(sortedObservedScreens[0] ?? ""));
    clearMessages();
  }

  function renderKeyEditorPanel(mode: "create" | "edit") {
    const detail = mode === "edit" ? selectedKeyDetail : null;
    if (mode === "create") {
      return (
        <section className="liquid-ops-inline-create-card">
          <div className="liquid-ops-inline-create-head">
            <div className="liquid-ops-inline-create-copy">
              <strong>Create key</strong>
              <span>Add one fallback string on a real Pollex screen.</span>
            </div>
            </div>
            <div className="liquid-ops-inline-create-grid">
              <label className="liquid-ops-inline-create-field">
                <span>Key name</span>
                <input
                  className="liquid-ops-input liquid-ops-table-input"
                  value={keyDraft.key}
                  onChange={(event) => setKeyDraft((current) => ({ ...current, key: event.target.value }))}
                  placeholder="checkout.primary_cta"
                />
              </label>
              <label className="liquid-ops-inline-create-field">
                <span>Observed screen</span>
                <LiquidSelect compact value={keyDraft.screenKey} options={observedScreenOptions} placeholder="Choose screen" onChange={(nextValue) => setKeyDraft((current) => ({ ...current, screenKey: nextValue }))} />
              </label>
              <label className="liquid-ops-inline-create-field">
                <span>Fallback text</span>
                <input
                  className="liquid-ops-input liquid-ops-table-input"
                  value={keyDraft.defaultText}
                  onChange={(event) => setKeyDraft((current) => ({ ...current, defaultText: event.target.value }))}
                  placeholder="Continue to payment"
                />
              </label>
              <label className="liquid-ops-inline-create-field">
                <span>Locale</span>
                <input
                  className="liquid-ops-input liquid-ops-table-input"
                  value={keyDraft.locale}
                  onChange={(event) => setKeyDraft((current) => ({ ...current, locale: event.target.value }))}
                  placeholder="en"
                />
              </label>
              <label className="liquid-ops-inline-create-field">
                <span>Status</span>
                <LiquidSelect compact value={keyDraft.enabled ? "active" : "archived"} options={keyStatusOptions} onChange={(nextValue) => setKeyDraft((current) => ({ ...current, enabled: nextValue === "active" }))} />
              </label>
              <div className="liquid-ops-row-actions liquid-ops-inline-row-actions">
                <button className="btn btn-primary btn-sm" type="button" onClick={saveKey} disabled={busy === "key"}>Create</button>
                <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => {
                  void requestCloseKeyEditor();
                }}
              >
                Close
              </button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="liquid-ops-inspector liquid-ops-inline-editor-card">
        <SectionTitle
          title="Edit key"
          body="Update this key directly under the row you are editing."
        />
        <div className="liquid-ops-form">
          <label className="liquid-ops-field">
            <span>Key name</span>
            <input className="liquid-ops-input" value={keyDraft.key} onChange={(event) => setKeyDraft((current) => ({ ...current, key: event.target.value }))} placeholder="checkout.primary_cta" />
          </label>
          <label className="liquid-ops-field">
            <span>Observed screen</span>
            <LiquidSelect value={keyDraft.screenKey} options={observedScreenOptions} placeholder="Choose screen" onChange={(nextValue) => setKeyDraft((current) => ({ ...current, screenKey: nextValue }))} />
          </label>
          <div className="liquid-ops-form-split">
            <label className="liquid-ops-field">
              <span>Default locale</span>
              <input className="liquid-ops-input" value={keyDraft.locale} onChange={(event) => setKeyDraft((current) => ({ ...current, locale: event.target.value }))} placeholder="en" />
            </label>
            <label className="liquid-ops-field">
              <span>Availability</span>
              <LiquidSelect value={keyDraft.enabled ? "active" : "archived"} options={keyStatusOptions} onChange={(nextValue) => setKeyDraft((current) => ({ ...current, enabled: nextValue === "active" }))} />
            </label>
          </div>
          <label className="liquid-ops-field">
            <span>Fallback text</span>
            <textarea className="liquid-ops-input liquid-ops-textarea" value={keyDraft.defaultText} onChange={(event) => setKeyDraft((current) => ({ ...current, defaultText: event.target.value }))} placeholder="Continue to payment" />
          </label>
        </div>
        <div className="liquid-ops-inspector-meta">
          <div><span>State</span><strong>{keyState(detail)}</strong></div>
          <div><span>Live revision</span><strong>{detail?.publishedRevision ?? 0}</strong></div>
          <div><span>Last publish</span><strong>{formatDate(detail?.publishedAt)}</strong></div>
        </div>
        <div className="liquid-ops-inspector-actions">
          <button className="btn btn-primary btn-sm" type="button" onClick={saveKey} disabled={busy === "key"}>Create key</button>
        </div>
      </section>
    );
  }

  function renderInlineKeyEditorRow() {
    const detail = selectedKeyDetail;
    const state = keyState(detail);
    return (
      <tr className="liquid-ops-inline-editor-row">
        <td>
          <input
            className="liquid-ops-input liquid-ops-table-input"
            value={keyDraft.key}
            onChange={(event) => setKeyDraft((current) => ({ ...current, key: event.target.value }))}
            placeholder="checkout.primary_cta"
          />
        </td>
        <td><LiquidSelect compact value={keyDraft.screenKey} options={observedScreenOptions} placeholder="Choose screen" onChange={(nextValue) => setKeyDraft((current) => ({ ...current, screenKey: nextValue }))} /></td>
        <td>
          <input
            className="liquid-ops-input liquid-ops-table-input"
            value={keyDraft.defaultText}
            onChange={(event) => setKeyDraft((current) => ({ ...current, defaultText: event.target.value }))}
            placeholder="Continue to payment"
          />
        </td>
        <td>
          <input
            className="liquid-ops-input liquid-ops-table-input"
            value={keyDraft.locale}
            onChange={(event) => setKeyDraft((current) => ({ ...current, locale: event.target.value }))}
            placeholder="en"
          />
        </td>
        <td>
          <div className="liquid-ops-inline-meta">
            <strong>{readinessLabel(detail?.readiness?.state)}</strong>
            <span>{detail?.dependencyCount ? `${detail.dependencyCount} dependencies` : "Fallback only"}</span>
          </div>
        </td>
        <td><LiquidSelect compact value={keyDraft.enabled ? "active" : "archived"} options={keyStatusOptions} onChange={(nextValue) => setKeyDraft((current) => ({ ...current, enabled: nextValue === "active" }))} /></td>
        <td>
          <div className="liquid-ops-inline-meta">
            <strong>{state}</strong>
            <span>{formatDate(detail?.draftUpdatedAt ?? detail?.publishedAt)}</span>
          </div>
        </td>
        <td>
          <div className="liquid-ops-row-actions liquid-ops-inline-row-actions">
            {keyDraft.id ? <button className="btn btn-ghost btn-sm" type="button" onClick={deleteKey} disabled={busy === "key-delete"}>Delete</button> : null}
            <button className="btn btn-ghost btn-sm" type="button" onClick={requestCloseKeyEditor}>Close</button>
          </div>
        </td>
      </tr>
    );
  }

  function renderProfileTraitBuilder(scope: "create" | "edit") {
    return (
      <div className="liquid-ops-inline-trait-builder">
        {profileDraft.traits.map((row, index) => {
          const trait = traitDefinitionByKey.get(row.traitKey) ?? null;
          return (
            <div key={`profile-${scope}-${index}`} className="liquid-ops-inline-trait-row">
              <div className="liquid-ops-trait-chip">
                <strong>{trait?.label ?? row.traitKey}</strong>
                <span>{TRAIT_VALUE_TYPES.find((item) => item.value === (trait?.valueType ?? row.valueType))?.label ?? row.valueType}</span>
              </div>
              <ProfileTraitValueInput row={row} trait={trait} onChange={(patch) => updateProfileTrait(index, patch)} />
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeProfileTraitRow(index)}>Remove</button>
            </div>
          );
        })}
      </div>
    );
  }

  function renderTraitComposer() {
    if (!traitComposer) return null;
    const trait = traitDefinitionByKey.get(traitComposer.traitKey) ?? null;
    if (!trait) return null;
    const title = traitComposer.replaceIndex != null ? "Update trait" : "Add trait";
    const targetLabel =
      traitComposer.targetProfileId === "create"
        ? profileDraft.name.trim() || "new profile"
        : profiles.find((profile) => profile.id === traitComposer.targetProfileId)?.name ?? "selected profile";
    return (
      <div className="liquid-ops-profile-popover liquid-ops-profile-popover-main">
        <div className="liquid-ops-profile-popover-head">
          <div>
            <strong>{title}</strong>
            <span>{trait.label} for {targetLabel}</span>
          </div>
          <Tag>{TRAIT_VALUE_TYPES.find((item) => item.value === trait.valueType)?.label ?? trait.valueType}</Tag>
        </div>
        <ProfileTraitValueInput row={traitComposer.row} trait={trait} onChange={(patch) => setTraitComposer((current) => (current ? { ...current, row: { ...current.row, ...patch } } : current))} />
        <div className="liquid-ops-profile-popover-actions">
          <button className="btn btn-primary btn-sm" type="button" onClick={saveTraitComposer}>Apply</button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={cancelTraitComposer}>Cancel</button>
        </div>
      </div>
    );
  }

  function renderAutomationStrip() {
    return (
      <section className="liquid-ops-surface liquid-ops-automation-strip">
        <SectionTitle
          title="Integration status"
          body="Liquid stays lightweight in the app. Pollex observes screens, records arriving traits, and highlights where personalization is still falling back."
        />
        <div className="liquid-ops-automation-grid">
          <div className="liquid-ops-automation-item">
            <strong>Observed screens</strong>
            <span>{formatNumber(integrationStatus.observedScreensCount)}</span>
          </div>
          <div className="liquid-ops-automation-item">
            <strong>Runtime resolves (7d)</strong>
            <span>{formatNumber(integrationStatus.runtimeResolveCount7d)}</span>
          </div>
          <div className="liquid-ops-automation-item">
            <strong>App trait coverage</strong>
            <span>{formatPercent(integrationStatus.appTraitCoverage)}</span>
          </div>
          <div className="liquid-ops-automation-item">
            <strong>Pollex trait coverage</strong>
            <span>{formatPercent(integrationStatus.computedTraitCoverage)}</span>
          </div>
          <div className="liquid-ops-automation-item">
            <strong>Personalized traffic</strong>
            <span>{formatPercent(integrationStatus.personalizedTrafficShare)}</span>
          </div>
          <div className="liquid-ops-automation-item">
            <strong>Fallback-only live keys</strong>
            <span>{formatNumber(integrationStatus.fallbackOnlyKeyCount)}</span>
          </div>
        </div>
      </section>
    );
  }

  function renderProfileTraitShelf() {
    return (
      <div className="liquid-ops-profile-shelf">
        <div className="liquid-ops-profile-shelf-copy">
          <strong>Trait library</strong>
          <span>Drag a trait onto a profile card to add it.</span>
        </div>
        <div className="liquid-ops-profile-pill-row">
          {traits.length === 0 ? <span className="liquid-ops-muted">Create traits first, then drag them onto profiles.</span> : null}
          {traits.map((trait) => (
            <button
              key={trait.id}
              className={`liquid-ops-trait-pill ${draggedTraitKey === trait.traitKey ? "is-dragging" : ""}`.trim()}
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "copy";
                event.dataTransfer.setData("text/plain", trait.traitKey);
                setDraggedTraitKey(trait.traitKey);
                clearMessages();
              }}
              onDragEnd={resetTraitDragState}
            >
              <span>{trait.label}</span>
              <small>{traitSourceLabel(trait.sourceType)} · {TRAIT_VALUE_TYPES.find((item) => item.value === trait.valueType)?.label ?? trait.valueType}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderProfileCard(profile: LiquidProfile) {
    const isEditing = activeProfileId === profile.id && profileMode === "edit";
    const accent = profileAccent(profile.id);
    const variantCount = profileVariantCount(profile.id);
    const isDropTarget = profileDropTarget === profile.id;
    if (isEditing) {
      return (
        <article
          key={profile.id}
          className={`liquid-ops-profile-card liquid-ops-profile-card-edit ${isDropTarget ? "is-drop-target" : ""}`.trim()}
          style={{ "--liquid-profile-accent": accent } as CSSProperties}
          onDragOver={(event) => {
            if (!draggedTraitKey) return;
            event.preventDefault();
            setProfileDropTarget(profile.id);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null) && profileDropTarget === profile.id) {
              setProfileDropTarget(null);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            const traitKey = event.dataTransfer.getData("text/plain") || draggedTraitKey;
            if (traitKey) openTraitComposerForTarget(profile.id, traitKey);
          }}
        >
          <div className="liquid-ops-profile-accent" aria-hidden="true" />
          <div className="liquid-ops-profile-card-head">
            <div>
              <div className="heading">Edit profile</div>
              <p className="panel-copy">Update the saved audience and the trait values it reuses.</p>
            </div>
            <Tag tone={profileDraft.enabled ? "green" : "amber"}>{profileDraft.enabled ? "Active" : "Paused"}</Tag>
          </div>
          <div className="liquid-ops-profile-edit-grid">
            <label className="liquid-ops-inline-create-field">
              <span>Profile name</span>
              <input className="liquid-ops-input liquid-ops-table-input" value={profileDraft.name} onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="liquid-ops-inline-create-field">
              <span>Profile key</span>
              <input className="liquid-ops-input liquid-ops-table-input" value={profileDraft.profileKey} onChange={(event) => setProfileDraft((current) => ({ ...current, profileKey: event.target.value }))} />
            </label>
            <label className="liquid-ops-inline-create-field liquid-ops-profile-field-wide">
              <span>Description</span>
              <input className="liquid-ops-input liquid-ops-table-input" value={profileDraft.description} onChange={(event) => setProfileDraft((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label className="liquid-ops-inline-create-field">
              <span>Status</span>
              <LiquidSelect compact value={profileDraft.enabled ? "active" : "paused"} options={activeStatusOptions} onChange={(nextValue) => setProfileDraft((current) => ({ ...current, enabled: nextValue === "active" }))} />
            </label>
          </div>
          <div className="liquid-ops-profile-section">
            <div className="liquid-ops-profile-section-head">
              <strong>Traits</strong>
              <span className="liquid-ops-muted">Drag a trait here to add one.</span>
            </div>
            {renderProfileTraitBuilder("edit")}
            {profileDraft.traits.length === 0 ? <div className="liquid-ops-profile-drop-hint">Drop a trait pill here to start building this profile.</div> : null}
          </div>
          <div className="liquid-ops-profile-card-actions">
            <button className="btn btn-ghost btn-sm" type="button" onClick={deleteProfile} disabled={busy === "profile-delete"}>Delete</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={requestCloseProfileEditor}>Close</button>
          </div>
        </article>
      );
    }
    return (
      <article
        key={profile.id}
        className={`liquid-ops-profile-card ${isDropTarget ? "is-drop-target" : ""}`.trim()}
        style={{ "--liquid-profile-accent": accent } as CSSProperties}
        onDragOver={(event) => {
          if (!draggedTraitKey) return;
          event.preventDefault();
          setProfileDropTarget(profile.id);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null) && profileDropTarget === profile.id) {
            setProfileDropTarget(null);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          const traitKey = event.dataTransfer.getData("text/plain") || draggedTraitKey;
          if (traitKey) openTraitComposerForTarget(profile.id, traitKey);
        }}
      >
        <div className="liquid-ops-profile-accent" aria-hidden="true" />
        <div className="liquid-ops-profile-card-head">
          <div className="liquid-ops-cell">
            <strong>{profile.name}</strong>
            <span>{profile.profileKey}</span>
          </div>
          <Tag tone={profile.enabled ? "green" : "amber"}>{profile.enabled ? "Active" : "Paused"}</Tag>
        </div>
        <p className="panel-copy liquid-ops-profile-copy">{profile.description || "No description yet."}</p>
        <div className="liquid-ops-profile-facts">
          <div><span>Traits</span><strong>{profile.traits.length}</strong></div>
          <div><span>Variants</span><strong>{variantCount}</strong></div>
          <div><span>Updated</span><strong>{formatDate(profile.updatedAt)}</strong></div>
        </div>
        {profile.readiness?.blockingIssues?.length ? (
          <div className="liquid-ops-note liquid-ops-note-inline">
            <Tag tone={readinessTone(profile.readiness.state)}>{readinessLabel(profile.readiness.state)}</Tag>
            <span>{profile.readiness.blockingIssues[0]}</span>
          </div>
        ) : null}
        <div className="liquid-ops-chip-row liquid-ops-profile-traits">
          {profile.traits.length === 0 ? <span className="liquid-ops-muted">No traits yet</span> : null}
          {profile.traits.map((trait) => <Tag key={`${profile.id}-${trait.traitKey}`}>{trait.label}: {formatProfileTraitDisplayValue(trait)} · {traitSourceLabel(trait.sourceType)}</Tag>)}
        </div>
        <div className="liquid-ops-profile-drop-hint">Drop a trait pill here to add or update this profile.</div>
        <div className="liquid-ops-profile-card-actions">
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => { void requestSelectProfile(profile.id); }}>Edit</button>
        </div>
      </article>
    );
  }

  function renderCreateProfileCard() {
    const isDropTarget = profileDropTarget === "create";
    return (
      <section
        className={`liquid-ops-profile-card liquid-ops-profile-card-edit liquid-ops-profile-card-create ${isDropTarget ? "is-drop-target" : ""}`.trim()}
        style={{ "--liquid-profile-accent": "rgba(127, 182, 255, 0.95)" } as CSSProperties}
        onDragOver={(event) => {
          if (!draggedTraitKey) return;
          event.preventDefault();
          setProfileDropTarget("create");
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null) && profileDropTarget === "create") {
            setProfileDropTarget(null);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          const traitKey = event.dataTransfer.getData("text/plain") || draggedTraitKey;
          if (traitKey) openTraitComposerForTarget("create", traitKey);
        }}
      >
        <div className="liquid-ops-profile-accent" aria-hidden="true" />
        <div className="liquid-ops-profile-card-head">
          <div>
            <div className="heading">New profile</div>
            <p className="panel-copy">Create a reusable audience from the traits you already defined.</p>
          </div>
          <Tag tone={profileDraft.enabled ? "green" : "amber"}>{profileDraft.enabled ? "Active" : "Paused"}</Tag>
        </div>
        <div className="liquid-ops-profile-edit-grid">
          <label className="liquid-ops-inline-create-field">
            <span>Profile name</span>
            <input className="liquid-ops-input liquid-ops-table-input" value={profileDraft.name} onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Power users" />
          </label>
          <label className="liquid-ops-inline-create-field">
            <span>Profile key</span>
            <input className="liquid-ops-input liquid-ops-table-input" value={profileDraft.profileKey} onChange={(event) => setProfileDraft((current) => ({ ...current, profileKey: event.target.value }))} placeholder="power_users" />
          </label>
          <label className="liquid-ops-inline-create-field liquid-ops-profile-field-wide">
            <span>Description</span>
            <input className="liquid-ops-input liquid-ops-table-input" value={profileDraft.description} onChange={(event) => setProfileDraft((current) => ({ ...current, description: event.target.value }))} placeholder="High intent repeat visitors" />
          </label>
          <label className="liquid-ops-inline-create-field">
            <span>Status</span>
            <LiquidSelect compact value={profileDraft.enabled ? "active" : "paused"} options={activeStatusOptions} onChange={(nextValue) => setProfileDraft((current) => ({ ...current, enabled: nextValue === "active" }))} />
          </label>
        </div>
        <div className="liquid-ops-profile-section">
          <div className="liquid-ops-profile-section-head">
            <strong>Traits</strong>
            <span className="liquid-ops-muted">Drag a trait here to add one.</span>
          </div>
          {renderProfileTraitBuilder("create")}
          {profileDraft.traits.length === 0 ? <div className="liquid-ops-profile-drop-hint">Drop a trait pill here to define the first rule for this profile.</div> : null}
        </div>
        <div className="liquid-ops-profile-card-actions">
          <button className="btn btn-primary btn-sm" type="button" onClick={() => void saveProfile()} disabled={busy === "profile"}>Create</button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={requestCloseProfileEditor}>Close</button>
        </div>
      </section>
    );
  }

  function renderKeysTab() {
    const hasObservedScreens = sortedObservedScreens.length > 0;
    const suggestedScreens = sortedObservedScreens.slice(0, 4);
    return (
      <div className="liquid-ops-stage">
        <div className="liquid-ops-toolbar">
          <SectionTitle
            title="Content keys"
            body="Create the text objects Liquid controls. Each key belongs to one observed Pollex screen and owns a default fallback copy."
          />
          <div className="liquid-ops-toolbar-actions">
            <div className="liquid-ops-search">
              <input
                aria-label="Search keys"
                value={keySearch}
                onChange={(event) => setKeySearch(event.target.value)}
                placeholder="Search keys, screens, or fallback text"
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              type="button"
              disabled={!hasObservedScreens}
              onClick={() => {
                setKeyMode("create");
                void requestSelectKey(null, "create");
              }}
            >
              Create key
            </button>
          </div>
        </div>

        {hasObservedScreens && keyMode === "create" ? renderKeyEditorPanel("create") : null}

        {hasObservedScreens && suggestedScreens.length > 0 ? (
          <div className="liquid-ops-surface liquid-ops-suggested-strip">
            <div className="liquid-ops-inline-meta">
              <strong>Suggested starting screens</strong>
              <span>Start from a screen Pollex is already observing.</span>
            </div>
            <div className="liquid-ops-chip-row">
              {suggestedScreens.map((screen) => (
                <button
                  key={screen}
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => {
                    setKeyMode("create");
                    setKeyDraft(emptyKeyDraft(screen));
                    setSelectedKeyId(null);
                  }}
                >
                  {screen}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!hasObservedScreens ? (
          <EmptyState
            title="No observed screens yet"
            body="Liquid keys must attach to real Pollex screens. Send session data first, then come back here to assign copy to a screen your users actually visit."
          />
        ) : filteredKeys.length === 0 ? (
          <EmptyState
            title={keys.length === 0 ? "No keys yet" : "No keys match this search"}
            body={
              keys.length === 0
                ? "Start with one fallback string for a real screen, then add profile-specific variants later in Rules."
                : "Try a different search or clear the filter to see every content key."
            }
          />
        ) : (
          <div className="liquid-ops-surface">
            <table className="data-table liquid-ops-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Screen</th>
                  <th>Fallback text</th>
                  <th>Locales</th>
                  <th>Readiness</th>
                  <th>State</th>
                  <th>Last updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredKeys.map((key) => {
                  const detail = detailsById[key.id] ?? null;
                  const state = keyState(detail);
                  return (
                    <Fragment key={key.id}>
                      <tr className={selectedKeyId === key.id ? "liquid-ops-row-active" : undefined}>
                        <td>
                          <div className="liquid-ops-cell">
                            <strong>{key.key}</strong>
                            <span>{titleFromKey(key.key)}</span>
                          </div>
                        </td>
                        <td>{getScreenKey(detail) || "Unassigned"}</td>
                        <td className="liquid-ops-copy-cell">{getDraftDefaultVariant(detail)?.content.text ?? "No fallback copy yet"}</td>
                        <td>{getLocaleCount(detail) || 1}</td>
                        <td>
                          <div className="liquid-ops-cell">
                            <Tag tone={readinessTone(key.readiness?.state)}>{readinessLabel(key.readiness?.state)}</Tag>
                            <span>{key.dependencyCount > 0 ? `${key.dependencyCount} trait dependencies` : "Fallback only"}</span>
                          </div>
                        </td>
                        <td><Tag tone={keyStateTone(state)}>{state}</Tag></td>
                        <td>{formatDate(detail?.draftUpdatedAt ?? key.updatedAt)}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void requestSelectKey(key.id, "edit");
                            }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                        {selectedKeyId === key.id && keyMode === "edit" ? renderInlineKeyEditorRow() : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderRulesTab() {
    const variantRows = draftProfileVariantRows();
    return (
      <div className="liquid-ops-stage liquid-ops-stack">
        <div className="liquid-ops-toolbar">
          <SectionTitle title="Rules workspace" body="Split reusable traits, saved profiles, and profile variants into their own tables so the workflow stays easy to scan." />
          <div className="liquid-ops-toolbar-actions">
            <div className="liquid-ops-subtabs">
              {(["profiles", "traits", "variants"] as RulesTab[]).map((tab) => (
                <button key={tab} type="button" className={rulesTab === tab ? "active" : ""} onClick={() => void requestRulesTabChange(tab)}>
                  {tab === "profiles" ? "Profiles" : tab === "traits" ? "Traits" : "Variants"}
                </button>
              ))}
            </div>
            {rulesTab === "profiles" ? <button className="btn btn-primary btn-sm" type="button" onClick={() => void requestSelectProfile(null)}>New profile</button> : null}
            {rulesTab === "traits" ? <button className="btn btn-primary btn-sm" type="button" onClick={() => void requestSelectTrait(null)}>New trait</button> : null}
            {rulesTab === "variants" ? <button className="btn btn-primary btn-sm" type="button" onClick={() => void requestSelectVariant(activeKeyId, activeProfileId, null)}>New variant</button> : null}
          </div>
        </div>

        {rulesTab === "traits" ? (
          <div className="liquid-ops-surface liquid-ops-stack">
            <div className="liquid-ops-note">
              <Tag tone="accent">System traits</Tag>
              <span>Pollex-computed traits appear automatically here. Create only app-backed or manual preview traits.</span>
            </div>
            {traitMode === "create" ? (
              <section className="liquid-ops-inline-create-card">
                <div className="liquid-ops-inline-create-grid liquid-ops-rules-create-grid-traits">
                  <label className="liquid-ops-inline-create-field"><span>Label</span><input className="liquid-ops-input liquid-ops-table-input" value={traitDraft.label} onChange={(event) => setTraitDraft((current) => ({ ...current, label: event.target.value }))} placeholder="Age" /></label>
                  <label className="liquid-ops-inline-create-field"><span>Trait key</span><input className="liquid-ops-input liquid-ops-table-input" value={traitDraft.traitKey} onChange={(event) => setTraitDraft((current) => ({ ...current, traitKey: event.target.value }))} placeholder="age" /></label>
                  <label className="liquid-ops-inline-create-field"><span>Type</span><LiquidSelect compact value={traitDraft.valueType} options={TRAIT_VALUE_TYPES.map((type) => ({ value: type.value, label: type.label }))} onChange={(nextValue) => setTraitDraft((current) => ({ ...current, valueType: nextValue as TraitDraft["valueType"] }))} /></label>
                  <label className="liquid-ops-inline-create-field"><span>Source</span><LiquidSelect compact value={traitDraft.sourceType} options={TRAIT_SOURCE_OPTIONS.map((type) => ({ value: type.value, label: type.label }))} onChange={(nextValue) => setTraitDraft((current) => ({ ...current, sourceType: nextValue as TraitDraft["sourceType"] }))} /></label>
                  <label className="liquid-ops-inline-create-field"><span>Source key</span><input className="liquid-ops-input liquid-ops-table-input" value={traitDraft.sourceKey} onChange={(event) => setTraitDraft((current) => ({ ...current, sourceKey: event.target.value }))} placeholder="user.plan or account.tier" /></label>
                  <label className="liquid-ops-inline-create-field"><span>Description</span><input className="liquid-ops-input liquid-ops-table-input" value={traitDraft.description} onChange={(event) => setTraitDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Reusable profile label" /></label>
                  <label className="liquid-ops-inline-create-field"><span>Example values</span><input className="liquid-ops-input liquid-ops-table-input" value={traitDraft.exampleValues} onChange={(event) => setTraitDraft((current) => ({ ...current, exampleValues: event.target.value }))} placeholder="growth, pro, enterprise" /></label>
                  <label className="liquid-ops-inline-create-field"><span>Status</span><LiquidSelect compact value={traitDraft.enabled ? "active" : "paused"} options={activeStatusOptions} onChange={(nextValue) => setTraitDraft((current) => ({ ...current, enabled: nextValue === "active" }))} /></label>
                  <div className="liquid-ops-row-actions liquid-ops-inline-row-actions"><button className="btn btn-primary btn-sm" type="button" onClick={saveTrait} disabled={busy === "trait"}>Create</button></div>
                </div>
              </section>
            ) : null}
            {traits.length === 0 ? <EmptyState title="No traits yet" body="Add reusable labels like Plan, Region, or Age before building profiles." /> : (
              <table className="data-table liquid-ops-table">
                <thead><tr><th>Label</th><th>Trait key</th><th>Type</th><th>Source</th><th>Source key</th><th>Coverage</th><th>Live</th><th>Description</th><th>Status</th><th>Updated</th><th /></tr></thead>
                <tbody>
                  {traits.map((trait) => (
                    <Fragment key={trait.id}>
                      <tr className={activeTraitId === trait.id ? "liquid-ops-row-active" : undefined}>
                        <td><div className="liquid-ops-cell"><strong>{trait.label}</strong>{isSystemTrait(trait) ? <span>Built in</span> : null}</div></td><td>{trait.traitKey}</td><td>{TRAIT_VALUE_TYPES.find((type) => type.value === trait.valueType)?.label ?? trait.valueType}</td><td>{traitSourceLabel(trait.sourceType)}</td><td>{trait.sourceKey || "Not mapped"}</td><td>{formatPercent(trait.coveragePercent)}</td><td><Tag tone={readinessTone(trait.liveEligible ? (trait.coveragePercent < 40 ? "low_coverage" : "ready") : "test_only")}>{trait.liveEligible ? "Live" : "Preview only"}</Tag></td><td className="liquid-ops-copy-cell">{trait.description || "No description"}</td><td><Tag tone={trait.enabled ? "green" : "amber"}>{trait.enabled ? "Active" : "Paused"}</Tag></td><td>{isSystemTrait(trait) ? "System" : formatDate(trait.updatedAt)}</td><td>{isSystemTrait(trait) ? <Tag tone="accent">System</Tag> : <button className="btn btn-ghost btn-sm" type="button" onClick={() => { void requestSelectTrait(trait.id); }}>Edit</button>}</td>
                      </tr>
                      {activeTraitId === trait.id && traitMode === "edit" && !isSystemTrait(trait) ? <tr className="liquid-ops-inline-editor-row"><td><input className="liquid-ops-input liquid-ops-table-input" value={traitDraft.label} onChange={(event) => setTraitDraft((current) => ({ ...current, label: event.target.value }))} /></td><td><input className="liquid-ops-input liquid-ops-table-input" value={traitDraft.traitKey} onChange={(event) => setTraitDraft((current) => ({ ...current, traitKey: event.target.value }))} /></td><td><LiquidSelect compact value={traitDraft.valueType} options={TRAIT_VALUE_TYPES.map((type) => ({ value: type.value, label: type.label }))} onChange={(nextValue) => setTraitDraft((current) => ({ ...current, valueType: nextValue as TraitDraft["valueType"] }))} /></td><td><LiquidSelect compact value={traitDraft.sourceType} options={TRAIT_SOURCE_OPTIONS.map((type) => ({ value: type.value, label: type.label }))} onChange={(nextValue) => setTraitDraft((current) => ({ ...current, sourceType: nextValue as TraitDraft["sourceType"] }))} /></td><td><input className="liquid-ops-input liquid-ops-table-input" value={traitDraft.sourceKey} onChange={(event) => setTraitDraft((current) => ({ ...current, sourceKey: event.target.value }))} /></td><td><div className="liquid-ops-inline-meta"><strong>{formatPercent(trait.coveragePercent)}</strong><span>{trait.exampleValues.join(", ") || "No samples"}</span></div></td><td><Tag tone={readinessTone(trait.liveEligible ? (trait.coveragePercent < 40 ? "low_coverage" : "ready") : "test_only")}>{trait.liveEligible ? "Live" : "Preview only"}</Tag></td><td><input className="liquid-ops-input liquid-ops-table-input" value={traitDraft.description} onChange={(event) => setTraitDraft((current) => ({ ...current, description: event.target.value }))} /></td><td><LiquidSelect compact value={traitDraft.enabled ? "active" : "paused"} options={activeStatusOptions} onChange={(nextValue) => setTraitDraft((current) => ({ ...current, enabled: nextValue === "active" }))} /></td><td><div className="liquid-ops-inline-meta"><strong>{formatDate(trait.updatedAt)}</strong></div></td><td><div className="liquid-ops-row-actions liquid-ops-inline-row-actions"><button className="btn btn-ghost btn-sm" type="button" onClick={deleteTrait} disabled={busy === "trait-delete"}>Delete</button></div></td></tr> : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}

        {rulesTab === "profiles" ? (
          <div className="liquid-ops-surface liquid-ops-stack">
            {renderProfileTraitShelf()}
            {renderTraitComposer()}
            {profiles.length === 0 && profileMode !== "create" ? <EmptyState title="No profiles yet" body="Create a saved audience after defining a few reusable traits." /> : null}
            {profiles.length > 0 || profileMode === "create" ? (
              <div className="liquid-ops-profile-grid">
                {profileMode === "create" ? renderCreateProfileCard() : null}
                {profiles.map((profile) => renderProfileCard(profile))}
              </div>
            ) : null}
          </div>
        ) : null}

        {rulesTab === "variants" ? (
          <div className="liquid-ops-surface liquid-ops-stack">
            <div className="liquid-ops-toolbar liquid-ops-toolbar-inline">
              <SectionTitle title="Profile variants" body="Attach saved profiles to keys and override the fallback string for that audience." />
            </div>
            {variantMode === "create" ? <section className="liquid-ops-inline-create-card"><div className="liquid-ops-inline-create-grid liquid-ops-rules-create-grid-variants"><label className="liquid-ops-inline-create-field"><span>Key</span><LiquidSelect compact value={variantDraft.keyId} options={keyOptions} placeholder="Choose key" onChange={(nextValue) => setVariantDraft((current) => ({ ...current, keyId: nextValue }))} /></label><label className="liquid-ops-inline-create-field"><span>Profile</span><LiquidSelect compact value={variantDraft.profileId} options={profileOptions} placeholder="Choose profile" onChange={(nextValue) => setVariantDraft((current) => ({ ...current, profileId: nextValue }))} /></label><label className="liquid-ops-inline-create-field"><span>Resolved copy</span><input className="liquid-ops-input liquid-ops-table-input" value={variantDraft.text} onChange={(event) => setVariantDraft((current) => ({ ...current, text: event.target.value }))} placeholder="Continue to payment" /></label><label className="liquid-ops-inline-create-field"><span>Locale</span><input className="liquid-ops-input liquid-ops-table-input" value={variantDraft.locale} onChange={(event) => setVariantDraft((current) => ({ ...current, locale: event.target.value }))} placeholder="en" /></label><label className="liquid-ops-inline-create-field"><span>Status</span><LiquidSelect compact value={variantDraft.enabled ? "ready" : "paused"} options={readyStatusOptions} onChange={(nextValue) => setVariantDraft((current) => ({ ...current, enabled: nextValue === "ready" }))} /></label><div className="liquid-ops-inline-meta"><strong>{profiles.find((item) => item.id === variantDraft.profileId)?.readiness ? readinessLabel(profiles.find((item) => item.id === variantDraft.profileId)?.readiness?.state) : "Choose a profile"}</strong><span>{profiles.find((item) => item.id === variantDraft.profileId)?.readiness?.blockingIssues?.[0] ?? "Live eligibility follows the selected profile's traits."}</span></div><div className="liquid-ops-row-actions liquid-ops-inline-row-actions"><button className="btn btn-primary btn-sm" type="button" onClick={saveVariant} disabled={busy === "variant"}>Create</button></div></div></section> : null}
            {variantRows.length === 0 ? <EmptyState title="No variants yet" body="Create a profile-specific variant when a saved audience should see copy different from the fallback." /> : (
              <table className="data-table liquid-ops-table">
                <thead><tr><th>Key</th><th>Profile</th><th>Resolved copy</th><th>Locale</th><th>Live readiness</th><th>Status</th><th>Updated</th><th /></tr></thead>
                <tbody>
                  {variantRows.map(({ key, detail, variant, profile }) => (
                    <Fragment key={variant.id}>
                      <tr className={selectedVariantId === variant.id ? "liquid-ops-row-active" : undefined}>
                        <td>{key.key}</td><td>{profile?.name ?? "Removed profile"}</td><td className="liquid-ops-copy-cell">{variant.content.text}</td><td>{variant.locale ?? detail?.defaultLocale ?? "en"}</td><td><Tag tone={readinessTone(profile?.readiness?.state)}>{readinessLabel(profile?.readiness?.state)}</Tag></td><td><Tag tone={variant.enabled ? "green" : "amber"}>{variant.enabled ? "Draft ready" : "Paused"}</Tag></td><td>{formatDate(variant.updatedAt)}</td><td><button className="btn btn-ghost btn-sm" type="button" onClick={() => { void requestSelectVariant(key.id, variant.segmentId ?? null, variant.id); }}>Edit</button></td>
                      </tr>
                      {selectedVariantId === variant.id && variantMode === "edit" ? <tr className="liquid-ops-inline-editor-row"><td><LiquidSelect compact value={variantDraft.keyId} options={keyOptions} onChange={(nextValue) => setVariantDraft((current) => ({ ...current, keyId: nextValue }))} /></td><td><LiquidSelect compact value={variantDraft.profileId} options={profileOptions} onChange={(nextValue) => setVariantDraft((current) => ({ ...current, profileId: nextValue }))} /></td><td><input className="liquid-ops-input liquid-ops-table-input" value={variantDraft.text} onChange={(event) => setVariantDraft((current) => ({ ...current, text: event.target.value }))} /></td><td><input className="liquid-ops-input liquid-ops-table-input" value={variantDraft.locale} onChange={(event) => setVariantDraft((current) => ({ ...current, locale: event.target.value }))} /></td><td><Tag tone={readinessTone(profile?.readiness?.state)}>{readinessLabel(profile?.readiness?.state)}</Tag></td><td><LiquidSelect compact value={variantDraft.enabled ? "ready" : "paused"} options={readyStatusOptions} onChange={(nextValue) => setVariantDraft((current) => ({ ...current, enabled: nextValue === "ready" }))} /></td><td><div className="liquid-ops-inline-meta"><strong>{profile?.name ?? "Profile"}</strong><span>{profile?.readiness?.blockingIssues?.[0] ?? getDraftDefaultVariant(detail)?.content.text ?? "No fallback"}</span></div></td><td><div className="liquid-ops-row-actions liquid-ops-inline-row-actions"><button className="btn btn-ghost btn-sm" type="button" onClick={deleteVariant} disabled={busy === "variant-delete"}>Delete</button></div></td></tr> : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  function renderStagingTab() {
    return (
      <div className="liquid-ops-stage liquid-ops-stack">
        <div className="liquid-ops-toolbar">
          <SectionTitle
            title="Draft and live staging"
            body="Review every key before it ships. Liquid now shows whether a key is ready for live traffic, which traits it depends on, and when fallback is still doing the work."
          />
        </div>
        {keys.length === 0 ? (
          <EmptyState title="No keys to stage" body="Create a key first, then this staging view will show draft and live state for each fallback and profile-specific variant." />
        ) : (
          <div className="liquid-ops-surface liquid-ops-stack">
            {keys.map((key) => {
              const detail = detailsById[key.id] ?? null;
              const draftDefault = getDraftDefaultVariant(detail);
              const liveDefault = getPublishedDefaultVariant(detail);
              const profileVariants = detail?.variants.filter((variant) => variant.stage === "draft" && variant.segmentId) ?? [];
              const state = keyState(detail);
              return (
                <div key={key.id} className={`liquid-ops-stage-row ${activeKeyId === key.id ? "active" : ""}`}>
                  <div className="liquid-ops-stage-row-top">
                    <div>
                      <div className="heading">{key.key}</div>
                      <div className="panel-copy">{getScreenKey(detail) || "Unassigned screen"} · {state}</div>
                    </div>
                    <div className="liquid-ops-row-actions">
                      <Tag tone={keyStateTone(state)}>{state}</Tag>
                      <Tag tone={readinessTone(detail?.readiness?.state)}>{readinessLabel(detail?.readiness?.state)}</Tag>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => void requestSelectKey(key.id, "edit")}>Inspect</button>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => detail ? void runPreview(detail, detail.variants.find((variant) => variant.stage === "draft" && variant.segmentId)?.segmentId ?? null) : undefined}>Run preview</button>
                      <button className="btn btn-primary btn-sm" type="button" onClick={(event) => { event.stopPropagation(); publishKey(key.id); }} disabled={busy === `publish-${key.id}`}>Push live</button>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={(event) => { event.stopPropagation(); demoteKey(key.id); }} disabled={detail?.publishedRevision === 0 || busy === `demote-${key.id}`}>Demote to draft</button>
                    </div>
                  </div>

                  <div className="liquid-ops-stage-grid">
                    <div>
                      <strong>Draft fallback</strong>
                      <p className="panel-copy">{draftDefault?.content.text ?? "No draft fallback yet"}</p>
                    </div>
                    <div>
                      <strong>Live fallback</strong>
                      <p className="panel-copy">{liveDefault?.content.text ?? "Nothing live yet"}</p>
                    </div>
                    <div>
                      <strong>Profile variants</strong>
                      <p className="panel-copy">{profileVariants.length} draft variants attached</p>
                    </div>
                    <div>
                      <strong>Last publish</strong>
                      <p className="panel-copy">{formatDate(detail?.publishedAt)}</p>
                    </div>
                    <div>
                      <strong>Readiness</strong>
                      <p className="panel-copy">{detail?.readiness?.blockingIssues?.[0] ?? (detail?.readiness?.state === "fallback_only" ? "This key is serving fallback copy only." : "This key is ready for live traffic.")}</p>
                    </div>
                  </div>

                  {profileVariants.length > 0 ? (
                    <div className="liquid-ops-chip-row">
                      {profileVariants.map((variant) => {
                        const profile = profiles.find((item) => item.id === variant.segmentId);
                        return <Tag key={variant.id}>{profile?.name ?? "Removed profile"} · {variant.content.text}</Tag>;
                      })}
                    </div>
                  ) : null}
                  {detail?.readiness?.dependentTraits?.length ? (
                    <div className="liquid-ops-chip-row">
                      {detail.readiness.dependentTraits.map((trait) => (
                        <Tag key={`${key.id}-${trait.traitKey}`}>{trait.label} · {traitSourceLabel(trait.sourceType)} · {formatPercent(trait.coveragePercent)}</Tag>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        {previewState.detail ? (
          <section className="liquid-ops-surface liquid-ops-stack">
            <SectionTitle title="Resolution preview" body="Preview uses the selected draft key and its attached profile traits so you can inspect the exact runtime decision before publishing." />
            {previewState.busy ? <div className="panel-copy">Running preview…</div> : null}
            {previewState.error ? <div className="liquid-ops-note"><Tag tone="red">Preview error</Tag><span>{previewState.error}</span></div> : null}
            {previewState.result ? (
              <>
                <div className="liquid-ops-context-grid">
                  <div><span>Screen</span><strong>{previewState.result.screenKey}</strong></div>
                  <div><span>Matched profiles</span><strong>{previewState.result.diagnostics.matchedProfileCount}</strong></div>
                  <div><span>Fallback items</span><strong>{previewState.result.diagnostics.fallbackItemCount}</strong></div>
                  <div><span>Missing traits</span><strong>{previewState.result.diagnostics.missingTraits.length}</strong></div>
                </div>
                <div className="liquid-ops-chip-row">
                  {previewState.result!.diagnostics.resolvedTraits.map((trait) => (
                    <Tag key={trait.traitKey}>{trait.traitKey}: {trait.present ? String(trait.value) : "Missing"} · {traitSourceLabel(trait.sourceType)}</Tag>
                  ))}
                </div>
                <table className="data-table liquid-ops-table">
                  <thead><tr><th>Key</th><th>Final text</th><th>Source</th><th>Matched profile</th><th>Fallback reason</th></tr></thead>
                  <tbody>
                    {previewState.result!.items.map((item) => (
                      <tr key={`${previewState.result!.screenKey}-${item.key}`}>
                        <td>{item.key}</td>
                        <td className="liquid-ops-copy-cell">{item.text}</td>
                        <td>{item.source}</td>
                        <td>{item.matchedProfileKey ?? "None"}</td>
                        <td>{item.fallbackReason ?? "Not applicable"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}
          </section>
        ) : null}
      </div>
    );
  }

  function renderAnalyticsTab() {
    return (
      <div className="liquid-ops-stage liquid-ops-stack">
        <div className="liquid-ops-toolbar">
          <SectionTitle
            title="Liquid analytics"
            body="Track how often Liquid personalizes traffic, where fallback still dominates, and which traits or profiles are limiting live match rate."
          />
          <div className="liquid-ops-toolbar-actions">
            <div className="liquid-ops-search">
              <input
                aria-label="Search analytics"
                value={analyticsSearch}
                onChange={(event) => setAnalyticsSearch(event.target.value)}
                placeholder="Search keys or screens"
              />
            </div>
          </div>
        </div>

        <div className="liquid-ops-note">
          <Tag tone="amber">Mixed data</Tag>
          <span>Runtime coverage and fallback share come from real Liquid resolve logs. Per-key lift is still modeled until full attribution lands.</span>
        </div>

        {metricRows.length === 0 ? (
          <EmptyState title="No analytics yet" body="Once keys exist, Liquid analytics will compare fallback copy and profile-specific variants side by side." />
        ) : (
          <>
            <div className="liquid-ops-analytics-grid">
              <div className="liquid-ops-surface">
                <SectionTitle title="Profiles needing attention" body="Profiles below are most likely to miss live traffic because of missing sources, test-only traits, or low coverage." />
                <div className="liquid-ops-ranked-list">
                  {profiles.filter((profile) => profile.readiness && profile.readiness.state !== "ready").slice(0, 4).map((profile) => (
                    <div key={profile.id} className="liquid-ops-ranked-item">
                      <div><strong>{profile.name}</strong><span>{profile.readiness?.blockingIssues?.[0] ?? readinessLabel(profile.readiness?.state)}</span></div>
                      <div className={profile.readiness?.state === "low_coverage" ? "liquid-ops-negative" : "liquid-ops-negative"}>{readinessLabel(profile.readiness?.state)}</div>
                    </div>
                  ))}
                  {profiles.filter((profile) => profile.readiness && profile.readiness.state !== "ready").length === 0 ? <div className="panel-copy">Every saved profile is live-safe right now.</div> : null}
                </div>
              </div>
            </div>
            <div className="liquid-ops-surface">
              <SectionTitle title="Default vs Liquid copy performance" />
              <table className="data-table liquid-ops-table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Screen</th>
                    <th>Exposures</th>
                    <th>Fallback rate</th>
                    <th>Liquid rate</th>
                    <th>Lift</th>
                    <th>Winner</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {metricRows.map((row) => (
                    <tr key={row.keyId} className={activeKeyId === row.keyId ? "liquid-ops-row-active" : undefined}>
                      <td>{row.key}</td>
                      <td>{row.screen}</td>
                      <td>{formatNumber(row.exposures)}</td>
                      <td>{formatPercent(row.defaultRate)}</td>
                      <td>{formatPercent(row.liquidRate)}</td>
                      <td className={row.lift >= 0 ? "liquid-ops-positive" : "liquid-ops-negative"}>{row.lift >= 0 ? "+" : ""}{formatPercent(row.lift)}</td>
                      <td>{row.winner}</td>
                      <td><button className="btn btn-ghost btn-sm" type="button" onClick={() => void requestSelectKey(row.keyId, "edit")}>Inspect</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="liquid-ops-analytics-grid">
              <div className="liquid-ops-surface">
                <SectionTitle title="User profile distribution" body="Pie chart by saved profile. Replace modeled shares with real traffic distribution later." />
                <div className="liquid-ops-pie-wrap">
                  <PieChart shares={shares} />
                  <div className="liquid-ops-legend">
                    {shares.map((share) => (
                      <div key={share.id} className="liquid-ops-legend-row">
                        <span className="liquid-ops-swatch" style={{ background: share.tone }} />
                        <strong>{share.label}</strong>
                        <span>{share.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="liquid-ops-surface">
                <SectionTitle title="Winning variants" body="Top keys where profile-specific copy is modeled to outperform the default fallback." />
                <div className="liquid-ops-ranked-list">
                  {winners.map((row) => (
                    <div key={`winner-${row.keyId}`} className="liquid-ops-ranked-row">
                      <div><strong>{row.key}</strong><span>{row.screen}</span></div>
                      <div className="liquid-ops-positive">+{formatPercent(row.lift)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="liquid-ops-surface">
                <SectionTitle title="Low-performing keys" body="Keys where Liquid has less modeled impact right now. These are the first places to revisit copy or profile coverage." />
                <div className="liquid-ops-ranked-list">
                  {underperformers.map((row) => (
                    <div key={`under-${row.keyId}`} className="liquid-ops-ranked-row">
                      <div><strong>{row.key}</strong><span>{row.screen}</span></div>
                      <div className={row.lift >= 0 ? "liquid-ops-positive" : "liquid-ops-negative"}>{row.lift >= 0 ? "+" : ""}{formatPercent(row.lift)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {renderAutomationStrip()}
          </>
        )}
      </div>
    );
  }

  function renderInspector() {
    if (activeTab === "keys" || activeTab === "rules" || activeTab === "analytics") {
      return null;
    }

    if (activeTab === "staging") {
      const detail = selectedKeyDetail;
      const draftVariants = detail?.variants.filter((variant) => variant.stage === "draft") ?? [];
      const liveVariants = detail?.variants.filter((variant) => variant.stage === "published") ?? [];
      return (
        <section className="liquid-ops-inspector">
          <SectionTitle title="Selected key" body="Use staging to verify what is still draft, what is live, and whether the key should be promoted or demoted." />
          {!detail ? (
            <EmptyState title="No key selected" body="Choose a key from staging to inspect its draft and live state." />
          ) : (
            <>
              <div className="liquid-ops-inspector-meta">
                <div><span>Key</span><strong>{detail.key}</strong></div>
                <div><span>Screen</span><strong>{getScreenKey(detail) || "Unassigned"}</strong></div>
                <div><span>State</span><strong>{keyState(detail)}</strong></div>
                <div><span>Live revision</span><strong>{detail.publishedRevision}</strong></div>
              </div>
              <div className="liquid-ops-stack">
                <div className="liquid-ops-context-block"><strong>Draft</strong><span>{draftVariants.length} variants prepared</span></div>
                <div className="liquid-ops-context-block"><strong>Live</strong><span>{liveVariants.length} variants currently shipping</span></div>
              </div>
              <div className="liquid-ops-inspector-actions">
                <button className="btn btn-primary btn-sm" type="button" onClick={() => publishKey(detail.id)} disabled={busy === `publish-${detail.id}`}>Push live</button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => demoteKey(detail.id)} disabled={detail.publishedRevision === 0 || busy === `demote-${detail.id}`}>Demote to draft</button>
              </div>
            </>
          )}
        </section>
      );
    }

    return null;
  }

  function renderOverview() {
    return (
      <section className="liquid-ops-overview">
        <div className="liquid-ops-overview-copy">
          <div className="liquid-ops-overview-kicker">Liquid workspace</div>
          <div className="liquid-ops-overview-title-row">
            <div>
              <h2 className="page-title">Personalization without losing the default path.</h2>
              <p className="panel-copy">
                Liquid now sits inside the same Pollex system: quieter chrome, clearer state, and one place to manage
                fallback copy, rules, staging, and runtime signal.
              </p>
            </div>
            <div className="liquid-ops-overview-focus">
              <span>Current focus</span>
              <strong>{selectedTabLabel}</strong>
              <p>{TAB_DESCRIPTIONS[activeTab]}</p>
            </div>
          </div>
        </div>

        <div className="liquid-ops-overview-metrics">
          <div className="liquid-ops-overview-metric">
            <span>Observed screens</span>
            <strong>{formatNumber(integrationStatus.observedScreensCount)}</strong>
            <p>Real product surfaces available for copy mapping.</p>
          </div>
          <div className="liquid-ops-overview-metric">
            <span>Live keys</span>
            <strong>{formatNumber(liveKeyCount)}</strong>
            <p>Keys currently shipping beyond draft state.</p>
          </div>
          <div className="liquid-ops-overview-metric">
            <span>Ready profiles</span>
            <strong>{formatNumber(readyProfileCount)}</strong>
            <p>Saved audiences already safe for live traffic.</p>
          </div>
          <div className="liquid-ops-overview-metric">
            <span>Profile variants</span>
            <strong>{formatNumber(variantCount)}</strong>
            <p>Audience-specific copy branches prepared in draft.</p>
          </div>
        </div>

        <div className="liquid-ops-overview-rail">
          <div className="liquid-ops-overview-status">
            <span>Personalized traffic</span>
            <strong>{formatPercent(integrationStatus.personalizedTrafficShare)}</strong>
          </div>
          <div className="liquid-ops-overview-status">
            <span>Fallback-only live keys</span>
            <strong>{formatNumber(integrationStatus.fallbackOnlyKeyCount)}</strong>
          </div>
          <div className="liquid-ops-overview-status">
            <span>Trait coverage</span>
            <strong>
              {formatPercent(integrationStatus.appTraitCoverage)} app / {formatPercent(integrationStatus.computedTraitCoverage)} Pollex
            </strong>
          </div>
        </div>
      </section>
    );
  }

  function PollexIcon({ icon }: { icon: "key" | "profile" | "variant" | "trait" | "staging" | "insight" | "add" | "edit" | "delete" | "close" | "preview" | "publish" }) {
    const props = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
    if (icon === "key") return <svg {...props}><circle cx="8.5" cy="12" r="3.2" /><path d="M11.7 12h7.3" /><path d="M16 12v2" /><path d="M18.8 12v1.6" /></svg>;
    if (icon === "profile") return <svg {...props}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 18.5c1.8-3 4.1-4.5 6.5-4.5s4.7 1.5 6.5 4.5" /></svg>;
    if (icon === "variant") return <svg {...props}><path d="M7 5v7c0 2.6 2.4 4 5 4h5" /><path d="M7 5h5" /><path d="M14 16h5" /><path d="M16.5 8.5 19 6l2.5 2.5" /></svg>;
    if (icon === "trait") return <svg {...props}><circle cx="6" cy="12" r="2" /><circle cx="18" cy="7" r="2" /><circle cx="18" cy="17" r="2" /><path d="M8 12h5" /><path d="M13 12l3-3" /><path d="M13 12l3 3" /></svg>;
    if (icon === "staging") return <svg {...props}><path d="M12 4v11" /><path d="m8 8 4-4 4 4" /><rect x="5" y="16" width="14" height="4" rx="1.5" /></svg>;
    if (icon === "insight") return <svg {...props}><path d="M5 18h14" /><path d="M8 18v-5" /><path d="M12 18V8" /><path d="M16 18v-8" /></svg>;
    if (icon === "add") return <svg {...props}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
    if (icon === "edit") return <svg {...props}><path d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" /><path d="m13.5 7.5 3 3" /></svg>;
    if (icon === "delete") return <svg {...props}><path d="M5 7h14" /><path d="M9 7V5.8c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3V7" /><path d="M8 9.5v8" /><path d="M12 9.5v8" /><path d="M16 9.5v8" /></svg>;
    if (icon === "close") return <svg {...props}><path d="m6 6 12 12" /><path d="M18 6 6 18" /></svg>;
    if (icon === "preview") return <svg {...props}><path d="M2.5 12s3.6-5.5 9.5-5.5S21.5 12 21.5 12 17.9 17.5 12 17.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.7" /></svg>;
    return <svg {...props}><path d="M12 20V8" /><path d="m7.5 12 4.5-4.5 4.5 4.5" /><path d="M5 4.5h14" /></svg>;
  }

  function PollexIconButton({
    icon,
    label,
    onClick,
    tone = "default",
    disabled = false,
  }: {
    icon: "edit" | "delete" | "close" | "preview" | "publish";
    label: string;
    onClick: () => void;
    tone?: "default" | "danger";
    disabled?: boolean;
  }) {
    return (
      <button type="button" className={`liquid-pollex-icon-button ${tone === "danger" ? "is-danger" : ""}`.trim()} onClick={onClick} aria-label={label} title={label} disabled={disabled}>
        <PollexIcon icon={icon} />
      </button>
    );
  }

  function PollexCommand({
    icon,
    label,
    onClick,
    disabled = false,
  }: {
    icon: "add" | "preview";
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }) {
    return (
      <button type="button" className="liquid-pollex-command" onClick={onClick} disabled={disabled}>
        <span className="liquid-pollex-command-glyph"><PollexIcon icon={icon} /></span>
        <span>{label}</span>
      </button>
    );
  }

  function renderPollexTraitBuilder() {
    return (
      <div className="liquid-pollex-profile-editor-trait-list">
        {profileDraft.traits.map((row, index) => {
          const trait = traitDefinitionByKey.get(row.traitKey) ?? null;
          return (
            <div key={`pollex-profile-${index}`} className="liquid-pollex-profile-editor-trait-row">
              <div className="liquid-pollex-profile-editor-trait-pill">
                <strong>{trait?.label ?? row.traitKey}</strong>
                <span>{TRAIT_VALUE_TYPES.find((item) => item.value === (trait?.valueType ?? row.valueType))?.label ?? row.valueType}</span>
              </div>
              <div className="liquid-pollex-profile-editor-trait-control">
                <ProfileTraitValueInput row={row} trait={trait} onChange={(patch) => updateProfileTrait(index, patch)} />
              </div>
              <PollexIconButton icon="delete" label={`Remove ${trait?.label || row.traitKey || "trait"}`} tone="danger" onClick={() => removeProfileTraitRow(index)} />
            </div>
          );
        })}
      </div>
    );
  }

  function renderPollexTraitComposer() {
    if (!traitComposer) return null;
    const trait = traitDefinitionByKey.get(traitComposer.traitKey) ?? null;
    if (!trait) return null;
    const targetLabel =
      traitComposer.targetProfileId === "create"
        ? profileDraft.name.trim() || "new profile"
        : profiles.find((profile) => profile.id === traitComposer.targetProfileId)?.name ?? "selected profile";
    return (
      <div className="liquid-pollex-composer">
        <div className="liquid-pollex-composer-head">
          <div>
            <strong>{traitComposer.replaceIndex != null ? "Update trait" : "Add trait"}</strong>
            <span>{trait.label} for {targetLabel}</span>
          </div>
          <Tag>{TRAIT_VALUE_TYPES.find((item) => item.value === trait.valueType)?.label ?? trait.valueType}</Tag>
        </div>
        <ProfileTraitValueInput row={traitComposer.row} trait={trait} onChange={(patch) => setTraitComposer((current) => (current ? { ...current, row: { ...current.row, ...patch } } : current))} />
        <div className="liquid-pollex-sheet-actions">
          <button className="btn btn-primary btn-sm" type="button" onClick={() => void saveTraitComposer()}>Apply</button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={cancelTraitComposer}>Cancel</button>
        </div>
      </div>
    );
  }

  const RenderPollexSheet = useMemo(
    () =>
      function RenderPollexSheet({
        title,
        icon,
        onClose,
        children,
        danger = false,
        className,
      }: {
        title: string;
        icon: "key" | "profile" | "variant" | "trait" | "staging";
        onClose: () => void;
        children: ReactNode;
        danger?: boolean;
        className?: string;
      }) {
        return (
          <aside className={`liquid-pollex-sheet ${danger ? "is-danger" : ""} ${className ?? ""}`.trim()}>
            <div className="liquid-pollex-sheet-head">
              <div className="liquid-pollex-sheet-title">
                <span className="liquid-pollex-sheet-icon"><PollexIcon icon={icon} /></span>
                <strong>{title}</strong>
              </div>
              <PollexIconButton icon="close" label="Close panel" onClick={onClose} />
            </div>
            {children}
          </aside>
        );
      },
    [],
  );

  function renderPollexField({
    label,
    children,
    wide = false,
  }: {
    label: string;
    children: ReactNode;
    wide?: boolean;
  }) {
    return (
      <label className={`liquid-pollex-field ${wide ? "is-wide" : ""}`.trim()}>
        <span>{label}</span>
        {children}
      </label>
    );
  }

  function renderPollexToggle(checked: boolean, onToggle: () => void, activeLabel = "Active", inactiveLabel = "Paused") {
    return (
      <div className="liquid-pollex-toggle">
        <button type="button" className={`liquid-pollex-switch ${checked ? "is-on" : ""}`.trim()} onClick={onToggle} aria-pressed={checked}>
          <span />
        </button>
        <strong>{checked ? activeLabel : inactiveLabel}</strong>
      </div>
    );
  }

  function renderPollexKeySheet() {
    if (keyPanelMode === "closed") return null;
    if (keyPanelMode === "delete") {
      return (
        <div className="liquid-pollex-sheet-rail">
          <RenderPollexSheet title="Delete Key" icon="key" onClose={() => void requestCloseKeyPanel()} danger>
            <div className="liquid-pollex-delete-copy">
              <p>Are you sure you want to delete “{keyDraft.key || "this key"}”? This action cannot be reversed.</p>
            </div>
            <div className="liquid-pollex-sheet-actions">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setKeyPanelMode("edit")}>Back</button>
              <button className="btn btn-primary btn-sm liquid-pollex-danger-button" type="button" onClick={() => void deleteKey()} disabled={busy === "key-delete"}>Delete</button>
            </div>
          </RenderPollexSheet>
        </div>
      );
    }
    return (
      <div className="liquid-pollex-sheet-rail">
        <RenderPollexSheet title={keyPanelMode === "create" ? "Create Key" : "Edit Key"} icon="key" onClose={() => void requestCloseKeyPanel()}>
          <div className="liquid-pollex-form-grid">
            {renderPollexField({ label: "Key Name", children: <input className="liquid-ops-input" value={keyDraft.key} onChange={(event) => setKeyDraft((current) => ({ ...current, key: event.target.value }))} placeholder="hello_message" /> })}
            {renderPollexField({ label: "Screen", children: <LiquidSelect value={keyDraft.screenKey} options={observedScreenOptions} placeholder="Choose screen" onChange={(nextValue) => setKeyDraft((current) => ({ ...current, screenKey: nextValue }))} /> })}
            {renderPollexField({ label: "Default Text", wide: true, children: <textarea className="liquid-ops-input liquid-ops-textarea" value={keyDraft.defaultText} onChange={(event) => setKeyDraft((current) => ({ ...current, defaultText: event.target.value }))} placeholder="Hello, welcome to Pollex!" /> })}
            {renderPollexField({ label: "Locale", children: <input className="liquid-ops-input" value={keyDraft.locale} onChange={(event) => setKeyDraft((current) => ({ ...current, locale: event.target.value }))} placeholder="en" /> })}
            {renderPollexField({ label: "Status", children: renderPollexToggle(keyDraft.enabled, () => setKeyDraft((current) => ({ ...current, enabled: !current.enabled })), "Live ready", "Paused") })}
          </div>
          <div className="liquid-pollex-sheet-actions">
            {keyPanelMode === "edit" ? <button className="btn btn-ghost btn-sm" type="button" onClick={() => setKeyPanelMode("delete")}>Delete</button> : null}
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => void requestCloseKeyPanel()}>Close</button>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => void saveKey()} disabled={busy === "key"}>{keyPanelMode === "create" ? "Create key" : "Save key"}</button>
          </div>
        </RenderPollexSheet>
      </div>
    );
  }

  function renderPollexProfileSheet() {
    if (profilePanelMode === "closed") return null;
    if (profilePanelMode === "delete") {
      return (
        <div className="liquid-pollex-sheet-rail">
          <RenderPollexSheet title="Delete Profile" icon="profile" onClose={() => void requestCloseProfilePanel()} danger>
            <div className="liquid-pollex-delete-copy">
              <p>Delete “{profileDraft.name || "this profile"}”? Any profile-specific variants that depend on it will lose their audience anchor.</p>
            </div>
            <div className="liquid-pollex-sheet-actions">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setProfilePanelMode("edit")}>Back</button>
              <button className="btn btn-primary btn-sm liquid-pollex-danger-button" type="button" onClick={() => void deleteProfile()} disabled={busy === "profile-delete"}>Delete</button>
            </div>
          </RenderPollexSheet>
        </div>
      );
    }
    return (
      <div className="liquid-pollex-sheet-rail">
        <RenderPollexSheet title={profilePanelMode === "create" ? "Create Profile" : "Edit Profile"} icon="profile" onClose={() => void requestCloseProfilePanel()}>
          <div className="liquid-pollex-form-grid">
            {renderPollexField({ label: "Profile Name", children: <input className="liquid-ops-input" value={profileDraft.name} onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Power users" /> })}
            {renderPollexField({ label: "Profile Key", children: <input className="liquid-ops-input" value={profileDraft.profileKey} onChange={(event) => setProfileDraft((current) => ({ ...current, profileKey: event.target.value }))} placeholder="power_users" /> })}
            {renderPollexField({ label: "Description", wide: true, children: <textarea className="liquid-ops-input liquid-ops-textarea" value={profileDraft.description} onChange={(event) => setProfileDraft((current) => ({ ...current, description: event.target.value }))} placeholder="High-intent repeat visitors ready for tailored onboarding." /> })}
            {renderPollexField({ label: "Status", children: renderPollexToggle(profileDraft.enabled, () => setProfileDraft((current) => ({ ...current, enabled: !current.enabled }))) })}
          </div>
          <div className="liquid-pollex-subsection">
            <div className="liquid-pollex-subsection-head">
              <strong>Traits</strong>
              <span>{profileDraft.traits.length} attached</span>
            </div>
            {renderPollexTraitBuilder()}
            {profileDraft.traits.length === 0 ? <div className="liquid-pollex-inline-callout">Drag a trait pill onto a profile card, or add one from the library below.</div> : null}
            {renderPollexTraitComposer()}
          </div>
          <div className="liquid-pollex-sheet-actions">
            {profilePanelMode === "edit" ? <button className="btn btn-ghost btn-sm" type="button" onClick={() => setProfilePanelMode("delete")}>Delete</button> : null}
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => void requestCloseProfilePanel()}>Close</button>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => void saveProfile()} disabled={busy === "profile"}>{profilePanelMode === "create" ? "Create profile" : "Save profile"}</button>
          </div>
        </RenderPollexSheet>
      </div>
    );
  }

  function renderPollexTraitSheet() {
    if (traitPanelMode === "closed") return null;
    if (traitPanelMode === "delete") {
      return (
        <div className="liquid-pollex-sheet-rail">
          <RenderPollexSheet title="Delete Trait" icon="trait" onClose={() => void requestCloseTraitPanel()} danger>
            <div className="liquid-pollex-delete-copy">
              <p>Delete “{traitDraft.label || traitDraft.traitKey || "this trait"}”? Profiles using it will need to be updated.</p>
            </div>
            <div className="liquid-pollex-sheet-actions">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setTraitPanelMode("edit")}>Back</button>
              <button className="btn btn-primary btn-sm liquid-pollex-danger-button" type="button" onClick={() => void deleteTrait()} disabled={busy === "trait-delete"}>Delete</button>
            </div>
          </RenderPollexSheet>
        </div>
      );
    }
    return (
      <div className="liquid-pollex-sheet-rail">
        <RenderPollexSheet title={traitPanelMode === "create" ? "Create Trait" : "Edit Trait"} icon="trait" onClose={() => void requestCloseTraitPanel()}>
          <div className="liquid-pollex-form-grid">
            {renderPollexField({ label: "Label", children: <input className="liquid-ops-input" value={traitDraft.label} onChange={(event) => setTraitDraft((current) => ({ ...current, label: event.target.value }))} placeholder="Plan tier" /> })}
            {renderPollexField({ label: "Trait Key", children: <input className="liquid-ops-input" value={traitDraft.traitKey} onChange={(event) => setTraitDraft((current) => ({ ...current, traitKey: event.target.value }))} placeholder="plan_tier" /> })}
            {renderPollexField({ label: "Value Type", children: <LiquidSelect value={traitDraft.valueType} options={TRAIT_VALUE_TYPES.map((type) => ({ value: type.value, label: type.label }))} onChange={(nextValue) => setTraitDraft((current) => ({ ...current, valueType: nextValue as TraitDraft["valueType"] }))} /> })}
            {renderPollexField({ label: "Source", children: <LiquidSelect value={traitDraft.sourceType} options={TRAIT_SOURCE_OPTIONS.map((type) => ({ value: type.value, label: type.label }))} onChange={(nextValue) => setTraitDraft((current) => ({ ...current, sourceType: nextValue as TraitDraft["sourceType"] }))} /> })}
            {renderPollexField({ label: "Source Key", wide: true, children: <input className="liquid-ops-input" value={traitDraft.sourceKey} onChange={(event) => setTraitDraft((current) => ({ ...current, sourceKey: event.target.value }))} placeholder="user.plan or account.region" /> })}
            {renderPollexField({ label: "Description", wide: true, children: <textarea className="liquid-ops-input liquid-ops-textarea" value={traitDraft.description} onChange={(event) => setTraitDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Reusable audience signal used across multiple experiences." /> })}
            {renderPollexField({ label: "Example Values", wide: true, children: <input className="liquid-ops-input" value={traitDraft.exampleValues} onChange={(event) => setTraitDraft((current) => ({ ...current, exampleValues: event.target.value }))} placeholder="free, pro, enterprise" /> })}
          </div>
          <div className="liquid-pollex-sheet-actions">
            {traitPanelMode === "edit" && traitDraft.sourceType !== "maze_computed" ? <button className="btn btn-ghost btn-sm" type="button" onClick={() => setTraitPanelMode("delete")}>Delete</button> : null}
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => void requestCloseTraitPanel()}>Close</button>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => void saveTrait()} disabled={busy === "trait"}>{traitPanelMode === "create" ? "Create trait" : "Save trait"}</button>
          </div>
        </RenderPollexSheet>
      </div>
    );
  }

  function renderPollexVariantSheet() {
    if (variantPanelMode === "closed") return null;
    if (variantPanelMode === "delete") {
      return (
        <div className="liquid-pollex-sheet-rail">
          <RenderPollexSheet title="Delete Variant" icon="variant" onClose={() => void requestCloseVariantPanel()} danger>
            <div className="liquid-pollex-delete-copy">
              <p>Delete this profile-specific branch? The key will fall back to its default copy for that audience.</p>
            </div>
            <div className="liquid-pollex-sheet-actions">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setVariantPanelMode("edit")}>Back</button>
              <button className="btn btn-primary btn-sm liquid-pollex-danger-button" type="button" onClick={() => void deleteVariant()} disabled={busy === "variant-delete"}>Delete</button>
            </div>
          </RenderPollexSheet>
        </div>
      );
    }
    return (
      <div className="liquid-pollex-sheet-rail">
        <RenderPollexSheet title={variantPanelMode === "create" ? "Create Variant" : "Edit Variant"} icon="variant" onClose={() => void requestCloseVariantPanel()}>
          <div className="liquid-pollex-form-grid">
            {renderPollexField({ label: "Key", children: <LiquidSelect value={variantDraft.keyId} options={keyOptions} placeholder="Choose key" onChange={(nextValue) => setVariantDraft((current) => ({ ...current, keyId: nextValue, locale: detailsById[nextValue]?.defaultLocale ?? current.locale }))} /> })}
            {renderPollexField({ label: "Profile", children: <LiquidSelect value={variantDraft.profileId} options={profileOptions} placeholder="Choose profile" onChange={(nextValue) => setVariantDraft((current) => ({ ...current, profileId: nextValue }))} /> })}
            {renderPollexField({ label: "Locale", children: <input className="liquid-ops-input" value={variantDraft.locale} onChange={(event) => setVariantDraft((current) => ({ ...current, locale: event.target.value }))} placeholder="en" /> })}
            {renderPollexField({ label: "Status", children: renderPollexToggle(variantDraft.enabled, () => setVariantDraft((current) => ({ ...current, enabled: !current.enabled })), "Draft ready", "Paused") })}
            {renderPollexField({ label: "Resolved Text", wide: true, children: <textarea className="liquid-ops-input liquid-ops-textarea" value={variantDraft.text} onChange={(event) => setVariantDraft((current) => ({ ...current, text: event.target.value }))} placeholder="Continue with Pro setup" /> })}
          </div>
          <div className="liquid-pollex-sheet-actions">
            {variantPanelMode === "edit" ? <button className="btn btn-ghost btn-sm" type="button" onClick={() => setVariantPanelMode("delete")}>Delete</button> : null}
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => void requestCloseVariantPanel()}>Close</button>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => void saveVariant()} disabled={busy === "variant"}>{variantPanelMode === "create" ? "Create variant" : "Save variant"}</button>
          </div>
        </RenderPollexSheet>
      </div>
    );
  }

  function renderPollexStagingSheet() {
    if (activeTab !== "staging" || !selectedKeyDetail) return null;
    const previewMatchesSelection = previewState.detail?.id === selectedKeyDetail.id;
    return (
      <div className="liquid-pollex-sheet-rail">
        <RenderPollexSheet title="Staging Context" icon="staging" onClose={() => setSelectedKeyId(null)}>
          <div className="liquid-pollex-sheet-metrics">
            <div><span>Key</span><strong>{selectedKeyDetail.key}</strong></div>
            <div><span>State</span><strong>{keyState(selectedKeyDetail)}</strong></div>
            <div><span>Live Revision</span><strong>{selectedKeyDetail.publishedRevision}</strong></div>
            <div><span>Last Publish</span><strong>{formatDate(selectedKeyDetail.publishedAt)}</strong></div>
          </div>
          <div className="liquid-pollex-inline-callout">
            {selectedKeyDetail.readiness?.blockingIssues?.[0] ?? "This key is ready for a draft-to-live decision."}
          </div>
          <div className="liquid-pollex-sheet-actions">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => void runPreview(selectedKeyDetail, selectedKeyDetail.variants.find((variant) => variant.stage === "draft" && variant.segmentId)?.segmentId ?? null)}>Run preview</button>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => void publishKey(selectedKeyDetail.id)} disabled={busy === `publish-${selectedKeyDetail.id}`}>Push live</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => void demoteKey(selectedKeyDetail.id)} disabled={selectedKeyDetail.publishedRevision === 0 || busy === `demote-${selectedKeyDetail.id}`}>Demote</button>
          </div>
          {previewMatchesSelection && previewState.error ? <div className="liquid-pollex-inline-callout is-danger">{previewState.error}</div> : null}
          {previewMatchesSelection && previewState.result ? (
            <div className="liquid-pollex-sheet-metrics">
              <div><span>Matched Profiles</span><strong>{previewState.result.diagnostics.matchedProfileCount}</strong></div>
              <div><span>Fallback Items</span><strong>{previewState.result.diagnostics.fallbackItemCount}</strong></div>
              <div><span>Missing Traits</span><strong>{previewState.result.diagnostics.missingTraits.length}</strong></div>
            </div>
          ) : null}
        </RenderPollexSheet>
      </div>
    );
  }

  function renderPollexTabs() {
    return (
      <div className="pollex-tabbar liquid-pollex-tabs" role="tablist" aria-label="Liquid views">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`pollex-tab ${activeTab === tab.id ? "active" : ""}`.trim()}
            onClick={() => void requestActiveTabChange(tab.id)}
          >
            <PollexIcon icon={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    );
  }

  function renderPollexFrame({
    title,
    subtitle,
    action,
    sheet,
    children,
  }: {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    sheet?: ReactNode;
    children: ReactNode;
  }) {
    return (
      <section className="liquid-pollex-surface">
        <div className="liquid-pollex-surface-head">
          <div className="liquid-pollex-surface-copy">
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {action ? <div className="liquid-pollex-surface-action">{action}</div> : null}
        </div>
        <div className={`liquid-pollex-surface-layout ${sheet ? "has-sheet" : ""}`.trim()}>
          <div className="liquid-pollex-surface-main">{children}</div>
          {sheet}
        </div>
      </section>
    );
  }

  function renderPollexEmpty(title: string, message: string) {
    return (
      <div className="liquid-pollex-empty">
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    );
  }

  function renderPollexKeysTab() {
    const hasObservedScreens = sortedObservedScreens.length > 0;
    return renderPollexFrame({
      title: "Key Table",
      subtitle: "Every user-facing copy surface starts here.",
      action: <PollexCommand icon="add" label="Create Key" onClick={() => void requestOpenKeyPanel("create")} disabled={!hasObservedScreens} />,
      sheet: renderPollexKeySheet(),
      children: !hasObservedScreens ? (
        renderPollexEmpty("Add records to start", "Liquid keys need at least one observed screen before they can be created.")
      ) : filteredKeys.length === 0 ? (
        renderPollexEmpty("Add records to start", "Create your first fallback string for a real screen. Variants can branch from it once profiles exist.")
      ) : (
        <div className="liquid-pollex-table-wrap">
          <table className="data-table liquid-pollex-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Screen</th>
                <th>Default Text</th>
                <th>Locales</th>
                <th>Readiness</th>
                <th>State</th>
                <th>Last Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredKeys.map((key) => {
                const detail = detailsById[key.id] ?? null;
                const state = keyState(detail);
                return (
                  <tr key={key.id} className={selectedKeyId === key.id && keyPanelMode !== "closed" ? "is-active" : ""}>
                    <td><div className="liquid-pollex-cell"><strong>{key.key}</strong><span>{titleFromKey(key.key)}</span></div></td>
                    <td>{getScreenKey(detail) || "Unassigned"}</td>
                    <td className="liquid-pollex-copy-cell">{getDraftDefaultVariant(detail)?.content.text ?? "No fallback text yet"}</td>
                    <td>{getLocaleCount(detail) || 1}</td>
                    <td><Tag tone={readinessTone(key.readiness?.state)}>{readinessLabel(key.readiness?.state)}</Tag></td>
                    <td><Tag tone={keyStateTone(state)}>{state}</Tag></td>
                    <td>{formatDate(detail?.draftUpdatedAt ?? key.updatedAt)}</td>
                    <td>
                      <div className="liquid-pollex-row-actions">
                        <PollexIconButton icon="edit" label="Edit key" onClick={() => void requestOpenKeyPanel("edit", key.id)} />
                        <PollexIconButton icon="delete" label="Delete key" tone="danger" onClick={() => void requestOpenKeyPanel("delete", key.id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ),
    });
  }

  function renderPollexProfilesTab() {
    return renderPollexFrame({
      title: "Profiles",
      subtitle: "Saved audiences should feel like browsing a cast, not parsing a spreadsheet.",
      action: <PollexCommand icon="add" label="Create Profile" onClick={() => void requestOpenProfilePanel("create")} />,
      sheet: renderPollexProfileSheet(),
      children: (
        <div className="liquid-pollex-stack">
          <div className="liquid-pollex-library">
            <div className="liquid-pollex-library-copy">
              <strong>Trait Library</strong>
              <span>Drag a pill onto a profile card to add it.</span>
            </div>
            <div className="liquid-pollex-pill-row">
              {traits.map((trait) => (
                <button
                  key={trait.id}
                  className={`liquid-pollex-trait-pill ${draggedTraitKey === trait.traitKey ? "is-dragging" : ""}`.trim()}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "copy";
                    event.dataTransfer.setData("text/plain", trait.traitKey);
                    setDraggedTraitKey(trait.traitKey);
                    clearMessages();
                  }}
                  onDragEnd={resetTraitDragState}
                >
                  <span>{trait.label}</span>
                  <small>{traitSourceLabel(trait.sourceType)} · {TRAIT_VALUE_TYPES.find((item) => item.value === trait.valueType)?.label ?? trait.valueType}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="liquid-pollex-profile-grid">
            {profiles.map((profile) => {
              const isDropTarget = profileDropTarget === profile.id;
              const variantTotal = profileVariantCount(profile.id);
              return (
                <article
                  key={profile.id}
                  className={`liquid-pollex-profile-card ${selectedProfileId === profile.id && profilePanelMode !== "closed" ? "is-selected" : ""} ${isDropTarget ? "is-drop-target" : ""}`.trim()}
                  style={{ "--liquid-profile-accent": profileAccent(profile.id) } as CSSProperties}
                  onDragOver={(event) => {
                    if (!draggedTraitKey) return;
                    event.preventDefault();
                    setProfileDropTarget(profile.id);
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null) && profileDropTarget === profile.id) setProfileDropTarget(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const traitKey = event.dataTransfer.getData("text/plain") || draggedTraitKey;
                    if (traitKey) openTraitComposerForTarget(profile.id, traitKey);
                  }}
                >
                  <div className="liquid-pollex-profile-accent" aria-hidden="true" />
                  <div className="liquid-pollex-profile-card-head">
                    <div className="liquid-pollex-cell"><strong>{profile.name}</strong><span>{profile.profileKey}</span></div>
                    <Tag tone={readinessTone(profile.readiness?.state)}>{readinessLabel(profile.readiness?.state)}</Tag>
                  </div>
                  <p>{profile.description || "No description yet."}</p>
                  <div className="liquid-pollex-profile-facts">
                    <div><span>Traits</span><strong>{profile.traits.length}</strong></div>
                    <div><span>Variants</span><strong>{variantTotal}</strong></div>
                    <div><span>Updated</span><strong>{formatDate(profile.updatedAt)}</strong></div>
                  </div>
                  <div className="liquid-pollex-pill-row">
                    {profile.traits.slice(0, 3).map((trait) => <Tag key={`${profile.id}-${trait.traitKey}`}>{trait.label}: {formatProfileTraitDisplayValue(trait)}</Tag>)}
                    {profile.traits.length > 3 ? <Tag>+{profile.traits.length - 3} more</Tag> : null}
                  </div>
                  {profile.readiness?.blockingIssues?.[0] ? <div className="liquid-pollex-inline-callout">{profile.readiness.blockingIssues[0]}</div> : null}
                  <div className="liquid-pollex-row-actions">
                    <PollexIconButton icon="edit" label="Edit profile" onClick={() => void requestOpenProfilePanel("edit", profile.id)} />
                    <PollexIconButton icon="delete" label="Delete profile" tone="danger" onClick={() => void requestOpenProfilePanel("delete", profile.id)} />
                  </div>
                </article>
              );
            })}
            {profiles.length === 0 ? renderPollexEmpty("Add records to start", "Create a reusable audience so Liquid can branch copy with clearer intent.") : null}
          </div>
        </div>
      ),
    });
  }

  function renderPollexProfileTraitRowsV2() {
    return (
      <div className="liquid-pollex-profile-editor-trait-list">
        {profileDraft.traits.map((row, index) => {
          const trait = traitDefinitionByKey.get(row.traitKey) ?? null;
          const valueType = trait?.valueType ?? row.valueType;
          return (
            <div key={`pollex-profile-v2-${index}`} className="liquid-pollex-profile-editor-trait-row">
              <div className="liquid-pollex-profile-editor-trait-pill">
                <strong>{trait?.label ?? row.traitKey}</strong>
                <span>{TRAIT_VALUE_TYPES.find((item) => item.value === valueType)?.label ?? valueType}</span>
              </div>
              <div className="liquid-pollex-profile-editor-trait-control">
                {valueType === "range" ? (
                  <div className="liquid-pollex-profile-editor-range">
                    <input
                      className="liquid-ops-input liquid-ops-table-input"
                      inputMode="decimal"
                      value={row.minValue}
                      onChange={(event) => updateProfileTrait(index, { minValue: event.target.value })}
                      placeholder="7"
                    />
                    <span>to</span>
                    <input
                      className="liquid-ops-input liquid-ops-table-input"
                      inputMode="decimal"
                      value={row.maxValue}
                      onChange={(event) => updateProfileTrait(index, { maxValue: event.target.value })}
                      placeholder="18"
                    />
                  </div>
                ) : (
                  <ProfileTraitValueInput row={row} trait={trait} onChange={(patch) => updateProfileTrait(index, patch)} />
                )}
              </div>
              <button
                type="button"
                className="liquid-pollex-profile-editor-trait-remove"
                aria-label={`Remove ${trait?.label || row.traitKey || "trait"}`}
                title={`Remove ${trait?.label || row.traitKey || "trait"}`}
                onClick={() => removeProfileTraitRow(index)}
              >
                <PollexIcon icon="close" />
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  function renderPollexProfileSheetV2() {
    if (profilePanelMode === "closed") return null;
    if (profilePanelMode === "delete") {
      return (
        <div className="liquid-pollex-sheet-rail liquid-pollex-profile-sheet-rail">
          <RenderPollexSheet title="Delete Profile" icon="profile" onClose={() => void requestCloseProfilePanel()} danger>
            <div className="liquid-pollex-delete-copy">
              <p>Delete "{profileDraft.name || "this profile"}"? Any profile-specific variants that depend on it will lose their audience anchor.</p>
            </div>
            <div className="liquid-pollex-sheet-actions">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setProfilePanelMode("edit")}>Back</button>
              <button className="btn btn-primary btn-sm liquid-pollex-danger-button" type="button" onClick={() => void deleteProfile()} disabled={busy === "profile-delete"}>Delete</button>
            </div>
          </RenderPollexSheet>
        </div>
      );
    }

    const previewAccent = profileAccent(profileDraft.id || profileDraft.profileKey || profileDraft.name || "draft-profile");
    const attachedTraitKeys = new Set(profileDraft.traits.map((trait) => trait.traitKey));
    const availableTraitOptions = traits
      .filter((trait) => !attachedTraitKeys.has(trait.traitKey))
      .map((trait) => ({ value: trait.traitKey, label: trait.label }));
    return (
      <div className="liquid-pollex-sheet-rail liquid-pollex-profile-sheet-rail">
        <RenderPollexSheet
          title={profilePanelMode === "create" ? "Create Profile" : "Edit Profile"}
          icon="profile"
          onClose={() => void requestCloseProfilePanel()}
          className="liquid-pollex-sheet-profile"
        >
          <div className="liquid-pollex-profile-editor">
            <div className="liquid-pollex-profile-editor-columns">
              <section className="liquid-pollex-profile-editor-panel liquid-pollex-profile-editor-panel-info">
                <div className="liquid-pollex-profile-editor-hero" style={{ "--liquid-profile-accent": previewAccent } as CSSProperties}>
                  <div className="liquid-pollex-profile-editor-avatar">
                    <span>{profileMonogram(profileDraft.name, profileDraft.profileKey)}</span>
                  </div>
                  <div className="liquid-pollex-profile-editor-hero-copy">
                    <strong>{profileDraft.name.trim() || "New profile"}</strong>
                    <span>{profileDraft.profileKey.trim() || "profile_key"}</span>
                    <small>{previewAccent}</small>
                  </div>
                </div>
                {renderPollexField({ label: "Profile Name", children: <input className="liquid-ops-input" value={profileDraft.name} onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Young Users" /> })}
                {renderPollexField({ label: "Profile key", children: <input className="liquid-ops-input" value={profileDraft.profileKey} onChange={(event) => setProfileDraft((current) => ({ ...current, profileKey: event.target.value }))} placeholder="young_users" /> })}
                {renderPollexField({ label: "Description", children: <textarea className="liquid-ops-input liquid-ops-textarea" value={profileDraft.description} onChange={(event) => setProfileDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Users in the range of 7 to 18 who should see age-aware copy." /> })}
                {renderPollexField({ label: "Status", children: renderPollexToggle(profileDraft.enabled, () => setProfileDraft((current) => ({ ...current, enabled: !current.enabled })), "Active", "Paused") })}
              </section>

              <section className="liquid-pollex-profile-editor-panel liquid-pollex-profile-editor-panel-traits">
                <div className="liquid-pollex-profile-editor-section-head">
                  <strong>Traits</strong>
                </div>
                {renderPollexProfileTraitRowsV2()}
                <div className="liquid-pollex-profile-editor-trait-row liquid-pollex-profile-editor-trait-row-add">
                  <div className="liquid-pollex-profile-editor-trait-pill">
                    <strong>Add a trait</strong>
                  </div>
                  <div className="liquid-pollex-profile-editor-trait-control">
                    <LiquidSelect
                      value=""
                      options={availableTraitOptions}
                      placeholder={availableTraitOptions.length ? "something" : "No more traits"}
                      disabled={availableTraitOptions.length === 0}
                      onChange={(nextValue) => {
                        const definition = traitDefinitionByKey.get(nextValue);
                        if (!definition) return;
                        setProfileDraft((current) => ({
                          ...current,
                          traits: [...current.traits, buildProfileTraitRowForTrait(definition)],
                        }));
                        clearMessages();
                      }}
                    />
                  </div>
                  <span className="liquid-pollex-profile-editor-trait-spacer" aria-hidden="true" />
                </div>
              </section>
            </div>
          </div>
          <div className="liquid-pollex-sheet-actions">
            {profilePanelMode === "edit" ? <button className="btn btn-ghost btn-sm" type="button" onClick={() => setProfilePanelMode("delete")}>Delete</button> : null}
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => void requestCloseProfilePanel()}>Close</button>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => void saveProfile()} disabled={busy === "profile"}>{profilePanelMode === "create" ? "Create profile" : "Save profile"}</button>
          </div>
        </RenderPollexSheet>
      </div>
    );
  }

  function renderPollexProfilesTabV2() {
    return renderPollexFrame({
      title: "Profiles",
      action: (
        <div className="liquid-pollex-profile-toolbar">
          <button className="liquid-pollex-profile-toolbar-icon" type="button" onClick={() => void requestActiveTabChange("traits")} aria-label="Open traits" title="Open traits">
            <PollexIcon icon="trait" />
          </button>
          <PollexCommand icon="add" label="Create Profile" onClick={() => void requestOpenProfilePanel("create")} />
        </div>
      ),
      sheet: renderPollexProfileSheetV2(),
      children: profiles.length === 0 ? (
        renderPollexEmpty("Add records to start", "Create a reusable audience so Liquid can branch copy with clearer intent.")
      ) : (
        <div className="liquid-pollex-profile-board">
          {profiles.map((profile) => {
            const accent = profileAccent(profile.id);
            const visibleTraits = profile.traits.slice(0, 4);
            const extraTraits = profile.traits.length - visibleTraits.length;
            return (
              <article
                key={profile.id}
                className={`liquid-pollex-profile-card liquid-pollex-profile-card-v2 ${selectedProfileId === profile.id && profilePanelMode !== "closed" ? "is-selected" : ""}`.trim()}
                style={{ "--liquid-profile-accent": accent } as CSSProperties}
                role="button"
                tabIndex={0}
                onClick={() => void requestOpenProfilePanel("edit", profile.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void requestOpenProfilePanel("edit", profile.id);
                  }
                }}
              >
                <div className="liquid-pollex-profile-card-glow" aria-hidden="true" />
                <div className="liquid-pollex-profile-card-avatar">
                  <span>{profileMonogram(profile.name, profile.profileKey)}</span>
                </div>
                <div className="liquid-pollex-profile-card-copy">
                  <strong>{profile.name}</strong>
                  <span>{profile.profileKey}</span>
                </div>
                <div className="liquid-pollex-profile-card-rules">
                  {visibleTraits.length === 0 ? (
                    <div className="liquid-pollex-profile-rule is-empty">
                      <span>Add traits</span>
                      <strong>Open editor</strong>
                    </div>
                  ) : (
                    visibleTraits.map((trait) => (
                      <div key={`${profile.id}-${trait.traitKey}`} className="liquid-pollex-profile-rule">
                        <span>{trait.label}</span>
                        <strong>{formatProfileTraitDisplayValue(trait)}</strong>
                      </div>
                    ))
                  )}
                  {extraTraits > 0 ? (
                    <div className="liquid-pollex-profile-rule is-more">
                      <span>More traits</span>
                      <strong>+{extraTraits}</strong>
                    </div>
                  ) : null}
                </div>
                <div className="liquid-pollex-profile-card-footer">
                  <div className="liquid-pollex-profile-card-meta">
                    <small>{readinessLabel(profile.readiness?.state)}</small>
                    <span>{profileVariantCount(profile.id)} variants</span>
                  </div>
                  <div className="liquid-pollex-row-actions">
                    <button
                      type="button"
                      className="liquid-pollex-icon-button"
                      aria-label="Edit profile"
                      title="Edit profile"
                      onClick={(event) => {
                        event.stopPropagation();
                        void requestOpenProfilePanel("edit", profile.id);
                      }}
                    >
                      <PollexIcon icon="edit" />
                    </button>
                    <button
                      type="button"
                      className="liquid-pollex-icon-button is-danger"
                      aria-label="Delete profile"
                      title="Delete profile"
                      onClick={(event) => {
                        event.stopPropagation();
                        void requestOpenProfilePanel("delete", profile.id);
                      }}
                    >
                      <PollexIcon icon="delete" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ),
    });
  }

  function renderPollexTraitsTab() {
    const traitUsageCount = (traitKey: string) => profiles.reduce((count, profile) => count + profile.traits.filter((trait) => trait.traitKey === traitKey).length, 0);
    return renderPollexFrame({
      title: "Traits",
      subtitle: "Traits keep their pill language in use, but are defined here as cards with source and coverage context.",
      action: <PollexCommand icon="add" label="Create Trait" onClick={() => void requestOpenTraitPanel("create")} />,
      sheet: renderPollexTraitSheet(),
      children: (
        <div className="liquid-pollex-trait-grid">
          {traits.map((trait) => (
            <article key={trait.id} className={`liquid-pollex-trait-card ${selectedTraitId === trait.id && traitPanelMode !== "closed" ? "is-selected" : ""}`.trim()}>
              <div className="liquid-pollex-trait-card-head">
                <div className="liquid-pollex-cell"><strong>{trait.label}</strong><span>{trait.traitKey}</span></div>
                {isSystemTrait(trait) ? <Tag tone="accent">System</Tag> : <Tag tone={trait.enabled ? "green" : "amber"}>{trait.enabled ? "Active" : "Paused"}</Tag>}
              </div>
              <p>{trait.description || "No description yet."}</p>
              <div className="liquid-pollex-pill-row">
                <Tag>{traitSourceLabel(trait.sourceType)}</Tag>
                <Tag>{TRAIT_VALUE_TYPES.find((item) => item.value === trait.valueType)?.label ?? trait.valueType}</Tag>
                <Tag tone={readinessTone(trait.liveEligible ? (trait.coveragePercent < 40 ? "low_coverage" : "ready") : "test_only")}>{trait.liveEligible ? "Live eligible" : "Preview only"}</Tag>
              </div>
              <div className="liquid-pollex-profile-facts">
                <div><span>Coverage</span><strong>{formatPercent(trait.coveragePercent)}</strong></div>
                <div><span>Used In</span><strong>{traitUsageCount(trait.traitKey)}</strong></div>
                <div><span>Source Key</span><strong>{trait.sourceKey || "Not mapped"}</strong></div>
              </div>
              <div className="liquid-pollex-row-actions">
                {!isSystemTrait(trait) ? <PollexIconButton icon="edit" label="Edit trait" onClick={() => void requestOpenTraitPanel("edit", trait.id)} /> : null}
                {!isSystemTrait(trait) ? <PollexIconButton icon="delete" label="Delete trait" tone="danger" onClick={() => void requestOpenTraitPanel("delete", trait.id)} /> : null}
              </div>
            </article>
          ))}
          {traits.length === 0 ? renderPollexEmpty("Add records to start", "Add reusable labels like region, plan, or lifecycle stage before composing audiences.") : null}
        </div>
      ),
    });
  }

  function renderPollexVariantsTab() {
    return renderPollexFrame({
      title: "Variants",
      subtitle: "Fallback remains the root. Profile-specific branches should show their hierarchy at a glance.",
      action: <PollexCommand icon="add" label="Create Variant" onClick={() => void requestOpenVariantPanel("create")} disabled={keys.length === 0 || profiles.length === 0} />,
      sheet: renderPollexVariantSheet(),
      children: (
        <div className="liquid-pollex-variant-groups">
          {keys.map((key) => {
            const detail = detailsById[key.id] ?? null;
            const variants = flatVariants.filter((entry) => entry.key.id === key.id);
            return (
              <section key={key.id} className="liquid-pollex-variant-group">
                <div className="liquid-pollex-variant-group-head">
                  <div className="liquid-pollex-cell"><strong>{key.key}</strong><span>{getScreenKey(detail) || "Unassigned"} · {variants.length} branches</span></div>
                  <div className="liquid-pollex-row-actions">
                    <Tag tone={readinessTone(detail?.readiness?.state)}>{readinessLabel(detail?.readiness?.state)}</Tag>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => void requestOpenVariantPanel("create", key.id, variants[0]?.profile?.id ?? profiles[0]?.id ?? null)}>New branch</button>
                  </div>
                </div>
                <div className="liquid-pollex-variant-root">
                  <div className="liquid-pollex-variant-node">Fallback</div>
                  <strong>{getDraftDefaultVariant(detail)?.content.text ?? "No fallback text yet"}</strong>
                  <span>{detail?.defaultLocale ?? "en"} · {keyState(detail)}</span>
                </div>
                <div className="liquid-pollex-variant-branches">
                  {variants.map(({ variant, profile }) => (
                    <article key={variant.id} className={`liquid-pollex-variant-branch ${selectedVariantId === variant.id && variantPanelMode !== "closed" ? "is-selected" : ""}`.trim()}>
                      <div className="liquid-pollex-variant-connector" aria-hidden="true" />
                      <div className="liquid-pollex-variant-copy">
                        <div className="liquid-pollex-cell"><strong>{profile?.name ?? "Removed profile"}</strong><span>{profile?.profileKey ?? "Unavailable"} · {variant.locale ?? detail?.defaultLocale ?? "en"}</span></div>
                        <p>{variant.content.text}</p>
                      </div>
                      <div className="liquid-pollex-row-actions">
                        <Tag tone={readinessTone(profile?.readiness?.state)}>{readinessLabel(profile?.readiness?.state)}</Tag>
                        <PollexIconButton icon="edit" label="Edit variant" onClick={() => void requestOpenVariantPanel("edit", key.id, profile?.id ?? null, variant.id)} />
                        <PollexIconButton icon="delete" label="Delete variant" tone="danger" onClick={() => void requestOpenVariantPanel("delete", key.id, profile?.id ?? null, variant.id)} />
                      </div>
                    </article>
                  ))}
                  {variants.length === 0 ? <div className="liquid-pollex-inline-callout">No profile-specific variants yet. This key still resolves to fallback only.</div> : null}
                </div>
              </section>
            );
          })}
          {keys.length === 0 ? renderPollexEmpty("Add records to start", "Create a key before you add profile-specific branches.") : null}
        </div>
      ),
    });
  }

  function renderPollexStagingTab() {
    return renderPollexFrame({
      title: "Staging Table",
      subtitle: "One operational table for draft, live, readiness, and launch decisions.",
      action: <PollexCommand icon="preview" label="Preview Selection" onClick={() => selectedKeyDetail ? void runPreview(selectedKeyDetail, selectedKeyDetail.variants.find((variant) => variant.stage === "draft" && variant.segmentId)?.segmentId ?? null) : undefined} disabled={!selectedKeyDetail} />,
      sheet: renderPollexStagingSheet(),
      children: (
        <div className="liquid-pollex-table-wrap">
          <table className="data-table liquid-pollex-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Screen</th>
                <th>Draft</th>
                <th>Live</th>
                <th>Variants</th>
                <th>Readiness</th>
                <th>Last Publish</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => {
                const detail = detailsById[key.id] ?? null;
                const draftDefault = getDraftDefaultVariant(detail);
                const liveDefault = getPublishedDefaultVariant(detail);
                const variants = detail?.variants.filter((variant) => variant.stage === "draft" && variant.segmentId) ?? [];
                return (
                  <tr key={key.id} className={selectedKeyId === key.id && activeTab === "staging" ? "is-active" : ""} onClick={() => setSelectedKeyId(key.id)}>
                    <td><strong>{key.key}</strong></td>
                    <td>{getScreenKey(detail) || "Unassigned"}</td>
                    <td className="liquid-pollex-copy-cell">{draftDefault?.content.text ?? "No draft fallback"}</td>
                    <td className="liquid-pollex-copy-cell">{liveDefault?.content.text ?? "Nothing live yet"}</td>
                    <td>{variants.length}</td>
                    <td><Tag tone={readinessTone(detail?.readiness?.state)}>{readinessLabel(detail?.readiness?.state)}</Tag></td>
                    <td>{formatDate(detail?.publishedAt)}</td>
                    <td>
                      <div className="liquid-pollex-row-actions">
                        <PollexIconButton icon="preview" label="Preview key" onClick={() => detail ? void runPreview(detail, variants[0]?.segmentId ?? null) : undefined} />
                        <PollexIconButton icon="publish" label="Push live" onClick={() => void publishKey(key.id)} disabled={busy === `publish-${key.id}`} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {keys.length === 0 ? renderPollexEmpty("Add records to start", "Create a key first, then Liquid can show draft and live state side by side.") : null}
        </div>
      ),
    });
  }

  function renderPollexInsightsTab() {
    const blockedProfiles = profiles.filter((profile) => profile.readiness && profile.readiness.state !== "ready").slice(0, 4);
    const blockedTraits = traits.filter((trait) => !trait.liveEligible || trait.coveragePercent < 45).slice(0, 4);
    const fallbackKeys = keys.filter((key) => key.readiness?.state === "fallback_only" || key.readiness?.state === "low_coverage").slice(0, 4);
    return renderPollexFrame({
      title: "Insights",
      subtitle: "Signal, blockers, and opportunity without drifting into a different product language.",
      action: <div className="liquid-pollex-search"><input value={insightsSearch} onChange={(event) => setInsightsSearch(event.target.value)} placeholder="Search keys or screens" aria-label="Search insights" /></div>,
      children: (
        <div className="liquid-pollex-insights-grid">
          <section className="liquid-pollex-panel">
            <div className="liquid-pollex-panel-head"><strong>Signal Summary</strong><Tag tone="accent">Live</Tag></div>
            <div className="liquid-pollex-profile-facts">
              <div><span>Observed screens</span><strong>{formatNumber(integrationStatus.observedScreensCount)}</strong></div>
              <div><span>Live keys</span><strong>{formatNumber(liveKeyCount)}</strong></div>
              <div><span>Ready profiles</span><strong>{formatNumber(readyProfileCount)}</strong></div>
            </div>
          </section>
          <section className="liquid-pollex-panel">
            <div className="liquid-pollex-panel-head"><strong>Fallback Pressure</strong><Tag tone="amber">{fallbackKeys.length}</Tag></div>
            <div className="liquid-pollex-ranked-list">
              {fallbackKeys.map((key) => <div key={key.id} className="liquid-pollex-ranked-row"><div><strong>{key.key}</strong><span>{getScreenKey(detailsById[key.id] ?? null) || "Unassigned"}</span></div><Tag tone={readinessTone(key.readiness?.state)}>{readinessLabel(key.readiness?.state)}</Tag></div>)}
              {fallbackKeys.length === 0 ? <span className="liquid-pollex-muted">Fallback pressure is low right now.</span> : null}
            </div>
          </section>
          <section className="liquid-pollex-panel">
            <div className="liquid-pollex-panel-head"><strong>Profiles Blocked</strong><Tag tone="amber">{blockedProfiles.length}</Tag></div>
            <div className="liquid-pollex-ranked-list">
              {blockedProfiles.map((profile) => <div key={profile.id} className="liquid-pollex-ranked-row"><div><strong>{profile.name}</strong><span>{profile.readiness?.blockingIssues?.[0] ?? readinessLabel(profile.readiness?.state)}</span></div><Tag tone={readinessTone(profile.readiness?.state)}>{readinessLabel(profile.readiness?.state)}</Tag></div>)}
              {blockedProfiles.length === 0 ? <span className="liquid-pollex-muted">Every saved profile is live-safe.</span> : null}
            </div>
          </section>
          <section className="liquid-pollex-panel">
            <div className="liquid-pollex-panel-head"><strong>Trait Coverage</strong><Tag tone="accent">{blockedTraits.length}</Tag></div>
            <div className="liquid-pollex-ranked-list">
              {blockedTraits.map((trait) => <div key={trait.id} className="liquid-pollex-ranked-row"><div><strong>{trait.label}</strong><span>{traitSourceLabel(trait.sourceType)} · {trait.sourceKey || "Not mapped"}</span></div><span>{formatPercent(trait.coveragePercent)}</span></div>)}
              {blockedTraits.length === 0 ? <span className="liquid-pollex-muted">Trait coverage looks healthy.</span> : null}
            </div>
          </section>
          <section className="liquid-pollex-panel liquid-pollex-panel-wide">
            <div className="liquid-pollex-panel-head"><strong>Modeled Lift</strong><Tag tone="accent">{metricRows.length}</Tag></div>
            <div className="liquid-pollex-table-wrap">
              <table className="data-table liquid-pollex-table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Screen</th>
                    <th>Fallback Rate</th>
                    <th>Liquid Rate</th>
                    <th>Lift</th>
                    <th>Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {metricRows.map((row) => (
                    <tr key={row.keyId}>
                      <td>{row.key}</td>
                      <td>{row.screen}</td>
                      <td>{formatPercent(row.defaultRate)}</td>
                      <td>{formatPercent(row.liquidRate)}</td>
                      <td className={row.lift >= 0 ? "liquid-pollex-positive" : "liquid-pollex-negative"}>{row.lift >= 0 ? "+" : ""}{formatPercent(row.lift)}</td>
                      <td>{row.winner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ),
    });
  }

  return (
    <div className="liquid-pollex-shell">
      {renderPollexTabs()}
      {notice ? <div className="liquid-pollex-banner success">{notice}</div> : null}
      {error ? <div className="liquid-pollex-banner error">{error}</div> : null}
      {activeTab === "keys" ? renderPollexKeysTab() : null}
      {activeTab === "profiles" ? renderPollexProfilesTabV2() : null}
      {activeTab === "variants" ? renderPollexVariantsTab() : null}
      {activeTab === "traits" ? renderPollexTraitsTab() : null}
      {activeTab === "staging" ? renderPollexStagingTab() : null}
      {activeTab === "insights" ? renderPollexInsightsTab() : null}
    </div>
  );
}
