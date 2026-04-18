"use client";

import { Fragment, startTransition, useDeferredValue, useState, type CSSProperties, type ReactNode } from "react";

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

type LiquidTab = "keys" | "rules" | "staging" | "analytics";
type RulesTab = "profiles" | "traits" | "variants";

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

const TABS: Array<{ id: LiquidTab; label: string }> = [
  { id: "keys", label: "Keys" },
  { id: "rules", label: "Rules" },
  { id: "staging", label: "Staging" },
  { id: "analytics", label: "Analytics" },
];

const PROFILE_COLORS = ["#7fb6ff", "#6ef2c0", "#f9c56d", "#c6a8ff", "#ff8ba7"];
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
  const [rulesTab, setRulesTab] = useState<RulesTab>("profiles");
  const [keyMode, setKeyMode] = useState<"create" | "edit">("edit");
  const [traitMode, setTraitMode] = useState<"create" | "edit">("edit");
  const [profileMode, setProfileMode] = useState<"create" | "edit">("edit");
  const [variantMode, setVariantMode] = useState<"create" | "edit">("edit");
  const [keySearch, setKeySearch] = useState("");
  const [analyticsSearch, setAnalyticsSearch] = useState("");
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
  const deferredAnalyticsSearch = useDeferredValue(analyticsSearch);

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
    const query = deferredAnalyticsSearch.trim().toLowerCase();
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

  async function persistKeyEditor() {
    if (!isKeyDraftDirty()) return true;
    return saveKey();
  }

  async function persistTraitEditor() {
    if (!isTraitDraftDirty()) return true;
    return saveTrait();
  }

  async function persistProfileEditor() {
    let nextDraft = profileDraft;
    if (traitComposer) {
      const composed = saveTraitComposer();
      if (composed === false) return false;
      nextDraft = composed;
    }
    if (!isProfileDraftDirty(nextDraft)) return true;
    return saveProfile(nextDraft);
  }

  async function persistVariantEditor() {
    const normalized = normalizeVariantDraftValue(variantDraft);
    if (variantMode === "create" && !variantDraft.id) {
      if (!isCompleteVariantDraft(variantDraft)) {
        resetVariantEditor();
        clearMessages();
        return true;
      }
    }
    if (!isVariantDraftDirty()) return true;
    if (!normalized.keyId || !normalized.profileId || !normalized.text.trim()) {
      if (variantMode === "edit" && variantDraft.id) {
        setVariantDraft(variantDraftBaseline);
      } else {
        resetVariantEditor();
      }
      clearMessages();
      return true;
    }
    return saveVariant();
  }

  async function persistActiveWorkspace() {
    if (activeTab === "keys") return persistKeyEditor();
    if (activeTab === "rules") {
      if (rulesTab === "traits") return persistTraitEditor();
      if (rulesTab === "profiles") return persistProfileEditor();
      if (rulesTab === "variants") return persistVariantEditor();
    }
    return true;
  }

  async function requestActiveTabChange(nextTab: LiquidTab) {
    if (nextTab === activeTab) return;
    const didPersist = await persistActiveWorkspace();
    if (!didPersist) return;
    startTransition(() => setActiveTab(nextTab));
  }

  async function requestRulesTabChange(nextTab: RulesTab) {
    if (nextTab === rulesTab) return;
    const didPersist = await persistActiveWorkspace();
    if (!didPersist) return;
    setRulesTab(nextTab);
  }

  async function requestSelectKey(keyId: string | null, nextMode: "create" | "edit" = "edit") {
    const didPersist = await persistKeyEditor();
    if (!didPersist) return;
    selectKey(keyId, nextMode);
  }

  async function requestSelectTrait(traitId: string | null) {
    const didPersist = await persistTraitEditor();
    if (!didPersist) return;
    selectTrait(traitId);
  }

  async function requestSelectProfile(profileId: string | null) {
    const didPersist = await persistProfileEditor();
    if (!didPersist) return;
    selectProfile(profileId);
  }

  async function requestSelectVariant(keyId: string | null, profileId: string | null, variantId: string | null = null) {
    const didPersist = await persistVariantEditor();
    if (!didPersist) return;
    selectVariant(keyId, profileId, variantId);
  }

  async function requestCloseKeyEditor() {
    const didPersist = await persistKeyEditor();
    if (!didPersist) return;
    setSelectedKeyId(null);
    setKeyMode("edit");
    setKeyDraft(emptyKeyDraft(sortedObservedScreens[0] ?? ""));
  }

  async function requestCloseProfileEditor() {
    const didPersist = await persistProfileEditor();
    if (!didPersist) return;
    closeProfileEditor();
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

  return (
    <div className="liquid-ops-shell">
      <div className="liquid-ops-main">
        <div className="liquid-ops-tabs">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => void requestActiveTabChange(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {notice ? <div className="liquid-ops-banner success">{notice}</div> : null}
        {error ? <div className="liquid-ops-banner error">{error}</div> : null}
        {activeTab === "staging" ? (
          <div className="liquid-ops-editor-zone">
            <div className="liquid-ops-editor-head">
              <span>Selected staging context</span>
              <p className="panel-copy">
                Review the selected key and decide whether it should stay draft or move live.
              </p>
            </div>
            {renderInspector()}
          </div>
        ) : null}

        {activeTab === "keys" ? renderKeysTab() : null}
        {activeTab === "rules" ? renderRulesTab() : null}
        {activeTab === "staging" ? renderStagingTab() : null}
        {activeTab === "analytics" ? renderAnalyticsTab() : null}
      </div>
    </div>
  );
}
