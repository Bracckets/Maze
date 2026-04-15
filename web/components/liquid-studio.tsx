"use client";

import { Fragment, startTransition, useDeferredValue, useState, type ReactNode } from "react";

import { Tag } from "@/components/ui";
import type {
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
  enabled: boolean;
};

type ProfileDraftRow = {
  traitKey: string;
  value: string;
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

const TABS: Array<{ id: LiquidTab; label: string }> = [
  { id: "keys", label: "Keys" },
  { id: "rules", label: "Rules" },
  { id: "staging", label: "Staging" },
  { id: "analytics", label: "Analytics" },
];

const PROFILE_COLORS = ["#7fb6ff", "#6ef2c0", "#f9c56d", "#c6a8ff", "#ff8ba7"];
const TRAIT_VALUE_TYPES: Array<{ value: TraitDraft["valueType"]; label: string }> = [
  { value: "text", label: "Text" },
  { value: "int", label: "Integer" },
  { value: "range", label: "Range" },
  { value: "boolean", label: "Boolean" },
  { value: "select", label: "Select" },
];

function emptyKeyDraft(screenKey = ""): KeyDraft {
  return { id: null, key: "", screenKey, defaultText: "", locale: "en", enabled: true };
}

function emptyTraitDraft(): TraitDraft {
  return { id: null, traitKey: "", label: "", description: "", valueType: "text", enabled: true };
}

function emptyProfileDraft(): ProfileDraft {
  return { id: null, profileKey: "", name: "", description: "", enabled: true, traits: [] };
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
    traits: profile.traits.map((trait) => ({ traitKey: trait.traitKey, value: trait.value })),
  };
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

export function LiquidStudio({
  initialKeys,
  initialKeyDetails,
  initialProfiles,
  initialTraits,
  observedScreens,
}: Props) {
  const sortedObservedScreens = [...observedScreens].sort((a, b) => a.localeCompare(b));
  const [activeTab, setActiveTab] = useState<LiquidTab>("keys");
  const [keys, setKeys] = useState(initialKeys);
  const [detailsById, setDetailsById] = useState<Record<string, LiquidKeyDetail>>(
    () => Object.fromEntries(initialKeyDetails.map((detail) => [detail.id, detail])) as Record<string, LiquidKeyDetail>,
  );
  const [profiles, setProfiles] = useState(initialProfiles);
  const [traits, setTraits] = useState(initialTraits);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(initialKeys[0]?.id ?? null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(initialProfiles[0]?.id ?? null);
  const [selectedTraitId, setSelectedTraitId] = useState<string | null>(initialTraits[0]?.id ?? null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [rulesTab, setRulesTab] = useState<RulesTab>("profiles");
  const [keyMode, setKeyMode] = useState<"create" | "edit">(initialKeys[0] ? "edit" : "create");
  const [traitMode, setTraitMode] = useState<"create" | "edit">(initialTraits[0] ? "edit" : "create");
  const [profileMode, setProfileMode] = useState<"create" | "edit">(initialProfiles[0] ? "edit" : "create");
  const [variantMode, setVariantMode] = useState<"create" | "edit">("create");
  const [keySearch, setKeySearch] = useState("");
  const [analyticsSearch, setAnalyticsSearch] = useState("");
  const [keyDraft, setKeyDraft] = useState<KeyDraft>(buildKeyDraft(initialKeyDetails[0] ?? null, sortedObservedScreens));
  const [traitDraft, setTraitDraft] = useState<TraitDraft>(buildTraitDraft(initialTraits[0] ?? null));
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(buildProfileDraft(initialProfiles[0] ?? null));
  const [variantDraft, setVariantDraft] = useState<VariantDraft>(buildVariantDraft(initialKeyDetails[0] ?? null, initialProfiles[0]?.id ?? null));
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deferredKeySearch = useDeferredValue(keySearch);
  const deferredAnalyticsSearch = useDeferredValue(analyticsSearch);

  const activeKeyId = selectedKeyId && keys.some((key) => key.id === selectedKeyId) ? selectedKeyId : keys[0]?.id ?? null;
  const activeProfileId = selectedProfileId && profiles.some((profile) => profile.id === selectedProfileId) ? selectedProfileId : profiles[0]?.id ?? null;
  const activeTraitId = selectedTraitId && traits.some((trait) => trait.id === selectedTraitId) ? selectedTraitId : traits[0]?.id ?? null;

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

  function clearMessages() {
    setNotice(null);
    setError(null);
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
  }

  function selectVariant(keyId: string | null, profileId: string | null, variantId: string | null = null) {
    const detail = keyId ? detailsById[keyId] ?? null : null;
    setSelectedKeyId(keyId);
    setSelectedProfileId(profileId);
    setSelectedVariantId(variantId);
    setVariantMode(variantId ? "edit" : "create");
    setVariantDraft(variantId ? buildVariantDraft(detail, profileId) : emptyVariantDraft(keyId ?? "", profileId ?? "", detail?.defaultLocale ?? "en"));
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
  }

  async function saveKey() {
    clearMessages();
    if (!keyDraft.key.trim()) {
      setError("Add a key name before saving.");
      return;
    }
    if (sortedObservedScreens.length === 0) {
      setError("Liquid needs at least one observed Maze screen before you can create keys.");
      return;
    }
    if (!keyDraft.screenKey) {
      setError("Choose an observed screen for this key.");
      return;
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
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save this key.");
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
      return;
    }
    setBusy("trait");
    try {
      const payload = {
        traitKey: traitDraft.traitKey.trim(),
        label: traitDraft.label.trim(),
        description: traitDraft.description.trim() || null,
        valueType: traitDraft.valueType,
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
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save this trait.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteTrait() {
    if (!traitDraft.id) return;
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

  async function saveProfile() {
    clearMessages();
    if (!profileDraft.profileKey.trim() || !profileDraft.name.trim()) {
      setError("Add a profile key and profile name.");
      return;
    }
    setBusy("profile");
    try {
      const payload = {
        profileKey: profileDraft.profileKey.trim(),
        name: profileDraft.name.trim(),
        description: profileDraft.description.trim() || null,
        enabled: profileDraft.enabled,
        traits: profileDraft.traits
          .filter((trait) => trait.traitKey.trim() && trait.value.trim())
          .map((trait) => ({ traitKey: trait.traitKey.trim(), value: trait.value.trim() })),
      };
      const profile = profileDraft.id
        ? await requestJson<LiquidProfile>(`/api/liquid/profiles/${profileDraft.id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await requestJson<LiquidProfile>("/api/liquid/profiles", { method: "POST", body: JSON.stringify(payload) });
      setProfiles((current) => {
        const exists = current.some((item) => item.id === profile.id);
        return exists ? current.map((item) => (item.id === profile.id ? profile : item)) : [profile, ...current];
      });
      setSelectedProfileId(profile.id);
      setProfileMode("edit");
      setNotice(profileDraft.id ? "Profile updated." : "Profile created.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save this profile.");
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
      return;
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
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save this profile copy.");
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
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not demote this key.");
    } finally {
      setBusy(null);
    }
  }

  function updateProfileTrait(index: number, patch: Partial<ProfileDraftRow>) {
    setProfileDraft((current) => {
      const next = [...current.traits];
      next[index] = { ...next[index], ...patch };
      return { ...current, traits: next };
    });
  }

  function addProfileTraitRow() {
    setProfileDraft((current) => ({ ...current, traits: [...current.traits, { traitKey: "", value: "" }] }));
  }

  function removeProfileTraitRow(index: number) {
    setProfileDraft((current) => ({ ...current, traits: current.traits.filter((_, itemIndex) => itemIndex !== index) }));
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

  function renderKeyEditorPanel(mode: "create" | "edit") {
    const detail = mode === "edit" ? selectedKeyDetail : null;
    if (mode === "create") {
      return (
        <section className="liquid-ops-inline-create-card">
          <div className="liquid-ops-inline-create-head">
            <div className="liquid-ops-inline-create-copy">
              <strong>Create key</strong>
              <span>Add one fallback string on a real Maze screen.</span>
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
                <select
                  className="liquid-ops-input liquid-ops-table-input"
                  value={keyDraft.screenKey}
                  onChange={(event) => setKeyDraft((current) => ({ ...current, screenKey: event.target.value }))}
                >
                  {sortedObservedScreens.length === 0 ? <option value="">No observed screens</option> : null}
                  {sortedObservedScreens.map((screen) => <option key={screen} value={screen}>{screen}</option>)}
                </select>
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
                <select
                  className="liquid-ops-input liquid-ops-table-input"
                  value={keyDraft.enabled ? "active" : "archived"}
                  onChange={(event) => setKeyDraft((current) => ({ ...current, enabled: event.target.value === "active" }))}
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <div className="liquid-ops-row-actions liquid-ops-inline-row-actions">
                <button className="btn btn-primary btn-sm" type="button" onClick={saveKey} disabled={busy === "key"}>Create</button>
                <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => {
                  setKeyMode("edit");
                  setKeyDraft(emptyKeyDraft(sortedObservedScreens[0] ?? ""));
                  clearMessages();
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
            <select className="liquid-ops-input" value={keyDraft.screenKey} onChange={(event) => setKeyDraft((current) => ({ ...current, screenKey: event.target.value }))}>
              {sortedObservedScreens.length === 0 ? <option value="">No observed screens</option> : null}
              {sortedObservedScreens.map((screen) => <option key={screen} value={screen}>{screen}</option>)}
            </select>
          </label>
          <div className="liquid-ops-form-split">
            <label className="liquid-ops-field">
              <span>Default locale</span>
              <input className="liquid-ops-input" value={keyDraft.locale} onChange={(event) => setKeyDraft((current) => ({ ...current, locale: event.target.value }))} placeholder="en" />
            </label>
            <label className="liquid-ops-field">
              <span>Availability</span>
              <select className="liquid-ops-input" value={keyDraft.enabled ? "active" : "archived"} onChange={(event) => setKeyDraft((current) => ({ ...current, enabled: event.target.value === "active" }))}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
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
        <td>
          <select
            className="liquid-ops-input liquid-ops-table-input"
            value={keyDraft.screenKey}
            onChange={(event) => setKeyDraft((current) => ({ ...current, screenKey: event.target.value }))}
          >
            {sortedObservedScreens.length === 0 ? <option value="">No observed screens</option> : null}
            {sortedObservedScreens.map((screen) => <option key={screen} value={screen}>{screen}</option>)}
          </select>
        </td>
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
          <select
            className="liquid-ops-input liquid-ops-table-input"
            value={keyDraft.enabled ? "active" : "archived"}
            onChange={(event) => setKeyDraft((current) => ({ ...current, enabled: event.target.value === "active" }))}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </td>
        <td>
          <div className="liquid-ops-inline-meta">
            <strong>{state}</strong>
            <span>{formatDate(detail?.draftUpdatedAt ?? detail?.publishedAt)}</span>
          </div>
        </td>
        <td>
          <div className="liquid-ops-row-actions liquid-ops-inline-row-actions">
            <button className="btn btn-primary btn-sm" type="button" onClick={saveKey} disabled={busy === "key"}>Save</button>
            {keyDraft.id ? <button className="btn btn-ghost btn-sm" type="button" onClick={deleteKey} disabled={busy === "key-delete"}>Delete</button> : null}
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setKeyMode("create"); clearMessages(); }}>Close</button>
          </div>
        </td>
      </tr>
    );
  }

  function renderKeysTab() {
    const hasObservedScreens = sortedObservedScreens.length > 0;
    return (
      <div className="liquid-ops-stage">
        <div className="liquid-ops-toolbar">
          <SectionTitle
            title="Content keys"
            body="Create the text objects Liquid controls. Each key belongs to one observed Maze screen and owns a default fallback copy."
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
                selectKey(null, "create");
                clearMessages();
              }}
            >
              Create key
            </button>
          </div>
        </div>

        {hasObservedScreens && keyMode === "create" ? renderKeyEditorPanel("create") : null}

        {!hasObservedScreens ? (
          <EmptyState
            title="No observed screens yet"
            body="Liquid keys must attach to real Maze screens. Send session data first, then come back here to assign copy to a screen your users actually visit."
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
                      <tr
                        className={selectedKeyId === key.id ? "liquid-ops-row-active" : undefined}
                        onClick={() => {
                          setSelectedKeyId(key.id);
                          clearMessages();
                        }}
                      >
                        <td>
                          <div className="liquid-ops-cell">
                            <strong>{key.key}</strong>
                            <span>{titleFromKey(key.key)}</span>
                          </div>
                        </td>
                        <td>{getScreenKey(detail) || "Unassigned"}</td>
                        <td className="liquid-ops-copy-cell">{getDraftDefaultVariant(detail)?.content.text ?? "No fallback copy yet"}</td>
                        <td>{getLocaleCount(detail) || 1}</td>
                        <td><Tag tone={keyStateTone(state)}>{state}</Tag></td>
                        <td>{formatDate(detail?.draftUpdatedAt ?? key.updatedAt)}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              selectKey(key.id, "edit");
                              clearMessages();
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
                <button key={tab} type="button" className={rulesTab === tab ? "active" : ""} onClick={() => setRulesTab(tab)}>
                  {tab === "profiles" ? "Profiles" : tab === "traits" ? "Traits" : "Variants"}
                </button>
              ))}
            </div>
            {rulesTab === "profiles" ? <button className="btn btn-primary btn-sm" type="button" onClick={() => selectProfile(null)}>New profile</button> : null}
            {rulesTab === "traits" ? <button className="btn btn-primary btn-sm" type="button" onClick={() => selectTrait(null)}>New trait</button> : null}
            {rulesTab === "variants" ? <button className="btn btn-primary btn-sm" type="button" onClick={() => selectVariant(activeKeyId, activeProfileId, null)}>New variant</button> : null}
          </div>
        </div>

        {rulesTab === "traits" ? (
          <div className="liquid-ops-surface liquid-ops-stack">
            {traitMode === "create" ? (
              <section className="liquid-ops-inline-create-card">
                <div className="liquid-ops-inline-create-grid liquid-ops-rules-create-grid-traits">
                  <label className="liquid-ops-inline-create-field"><span>Label</span><input className="liquid-ops-input liquid-ops-table-input" value={traitDraft.label} onChange={(event) => setTraitDraft((current) => ({ ...current, label: event.target.value }))} placeholder="Age" /></label>
                  <label className="liquid-ops-inline-create-field"><span>Trait key</span><input className="liquid-ops-input liquid-ops-table-input" value={traitDraft.traitKey} onChange={(event) => setTraitDraft((current) => ({ ...current, traitKey: event.target.value }))} placeholder="age" /></label>
                  <label className="liquid-ops-inline-create-field"><span>Type</span><select className="liquid-ops-input liquid-ops-table-input" value={traitDraft.valueType} onChange={(event) => setTraitDraft((current) => ({ ...current, valueType: event.target.value as TraitDraft["valueType"] }))}>{TRAIT_VALUE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
                  <label className="liquid-ops-inline-create-field"><span>Description</span><input className="liquid-ops-input liquid-ops-table-input" value={traitDraft.description} onChange={(event) => setTraitDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Reusable profile label" /></label>
                  <label className="liquid-ops-inline-create-field"><span>Status</span><select className="liquid-ops-input liquid-ops-table-input" value={traitDraft.enabled ? "active" : "paused"} onChange={(event) => setTraitDraft((current) => ({ ...current, enabled: event.target.value === "active" }))}><option value="active">Active</option><option value="paused">Paused</option></select></label>
                  <div className="liquid-ops-row-actions liquid-ops-inline-row-actions"><button className="btn btn-primary btn-sm" type="button" onClick={saveTrait} disabled={busy === "trait"}>Create</button></div>
                </div>
              </section>
            ) : null}
            {traits.length === 0 ? <EmptyState title="No traits yet" body="Add reusable labels like Plan, Region, or Age before building profiles." /> : (
              <table className="data-table liquid-ops-table">
                <thead><tr><th>Label</th><th>Trait key</th><th>Type</th><th>Description</th><th>Status</th><th>Updated</th><th /></tr></thead>
                <tbody>
                  {traits.map((trait) => (
                    <Fragment key={trait.id}>
                      <tr className={activeTraitId === trait.id ? "liquid-ops-row-active" : undefined} onClick={() => { selectTrait(trait.id); clearMessages(); }}>
                        <td><strong>{trait.label}</strong></td><td>{trait.traitKey}</td><td>{TRAIT_VALUE_TYPES.find((type) => type.value === trait.valueType)?.label ?? trait.valueType}</td><td className="liquid-ops-copy-cell">{trait.description || "No description"}</td><td><Tag tone={trait.enabled ? "green" : "amber"}>{trait.enabled ? "Active" : "Paused"}</Tag></td><td>{formatDate(trait.updatedAt)}</td><td><button className="btn btn-ghost btn-sm" type="button" onClick={(event) => { event.stopPropagation(); selectTrait(trait.id); }}>Edit</button></td>
                      </tr>
                      {activeTraitId === trait.id && traitMode === "edit" ? <tr className="liquid-ops-inline-editor-row"><td><input className="liquid-ops-input liquid-ops-table-input" value={traitDraft.label} onChange={(event) => setTraitDraft((current) => ({ ...current, label: event.target.value }))} /></td><td><input className="liquid-ops-input liquid-ops-table-input" value={traitDraft.traitKey} onChange={(event) => setTraitDraft((current) => ({ ...current, traitKey: event.target.value }))} /></td><td><select className="liquid-ops-input liquid-ops-table-input" value={traitDraft.valueType} onChange={(event) => setTraitDraft((current) => ({ ...current, valueType: event.target.value as TraitDraft["valueType"] }))}>{TRAIT_VALUE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></td><td><input className="liquid-ops-input liquid-ops-table-input" value={traitDraft.description} onChange={(event) => setTraitDraft((current) => ({ ...current, description: event.target.value }))} /></td><td><select className="liquid-ops-input liquid-ops-table-input" value={traitDraft.enabled ? "active" : "paused"} onChange={(event) => setTraitDraft((current) => ({ ...current, enabled: event.target.value === "active" }))}><option value="active">Active</option><option value="paused">Paused</option></select></td><td><div className="liquid-ops-inline-meta"><strong>{formatDate(trait.updatedAt)}</strong></div></td><td><div className="liquid-ops-row-actions liquid-ops-inline-row-actions"><button className="btn btn-primary btn-sm" type="button" onClick={saveTrait} disabled={busy === "trait"}>Save</button><button className="btn btn-ghost btn-sm" type="button" onClick={deleteTrait} disabled={busy === "trait-delete"}>Delete</button></div></td></tr> : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}

        {rulesTab === "profiles" ? (
          <div className="liquid-ops-surface liquid-ops-stack">
            {profileMode === "create" ? (
              <section className="liquid-ops-inline-create-card liquid-ops-inline-create-card-tall">
                <div className="liquid-ops-rules-create-grid-profiles">
                  <label className="liquid-ops-inline-create-field"><span>Profile name</span><input className="liquid-ops-input liquid-ops-table-input" value={profileDraft.name} onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Power users" /></label>
                  <label className="liquid-ops-inline-create-field"><span>Profile key</span><input className="liquid-ops-input liquid-ops-table-input" value={profileDraft.profileKey} onChange={(event) => setProfileDraft((current) => ({ ...current, profileKey: event.target.value }))} placeholder="power_users" /></label>
                  <label className="liquid-ops-inline-create-field"><span>Description</span><input className="liquid-ops-input liquid-ops-table-input" value={profileDraft.description} onChange={(event) => setProfileDraft((current) => ({ ...current, description: event.target.value }))} placeholder="High intent repeat visitors" /></label>
                  <label className="liquid-ops-inline-create-field"><span>Status</span><select className="liquid-ops-input liquid-ops-table-input" value={profileDraft.enabled ? "active" : "paused"} onChange={(event) => setProfileDraft((current) => ({ ...current, enabled: event.target.value === "active" }))}><option value="active">Active</option><option value="paused">Paused</option></select></label>
                </div>
                <div className="liquid-ops-inline-trait-builder">{profileDraft.traits.map((row, index) => <div key={`profile-create-${index}`} className="liquid-ops-inline-trait-row"><select className="liquid-ops-input liquid-ops-table-input" value={row.traitKey} onChange={(event) => updateProfileTrait(index, { traitKey: event.target.value })}><option value="">Trait</option>{traits.map((trait) => <option key={trait.id} value={trait.traitKey}>{trait.label}</option>)}</select><input className="liquid-ops-input liquid-ops-table-input" value={row.value} onChange={(event) => updateProfileTrait(index, { value: event.target.value })} placeholder="Value" /><button className="btn btn-ghost btn-sm" type="button" onClick={() => removeProfileTraitRow(index)}>Remove</button></div>)}</div>
                <div className="liquid-ops-row-actions liquid-ops-inline-row-actions"><button className="btn btn-ghost btn-sm" type="button" onClick={addProfileTraitRow}>Add trait</button><button className="btn btn-primary btn-sm" type="button" onClick={saveProfile} disabled={busy === "profile"}>Create</button></div>
              </section>
            ) : null}
            {profiles.length === 0 ? <EmptyState title="No profiles yet" body="Create a saved audience after defining a few reusable traits." /> : (
              <table className="data-table liquid-ops-table">
                <thead><tr><th>Profile</th><th>Traits</th><th>Description</th><th>Status</th><th>Updated</th><th /></tr></thead>
                <tbody>
                  {profiles.map((profile) => (
                    <Fragment key={profile.id}>
                      <tr className={activeProfileId === profile.id ? "liquid-ops-row-active" : undefined} onClick={() => { selectProfile(profile.id); clearMessages(); }}>
                        <td><div className="liquid-ops-cell"><strong>{profile.name}</strong><span>{profile.profileKey}</span></div></td><td><div className="liquid-ops-chip-row">{profile.traits.length === 0 ? <span className="liquid-ops-muted">No traits</span> : null}{profile.traits.slice(0, 3).map((trait) => <Tag key={`${profile.id}-${trait.traitKey}`}>{trait.label}: {trait.value}</Tag>)}{profile.traits.length > 3 ? <Tag>+{profile.traits.length - 3}</Tag> : null}</div></td><td className="liquid-ops-copy-cell">{profile.description || "No description"}</td><td><Tag tone={profile.enabled ? "green" : "amber"}>{profile.enabled ? "Active" : "Paused"}</Tag></td><td>{formatDate(profile.updatedAt)}</td><td><button className="btn btn-ghost btn-sm" type="button" onClick={(event) => { event.stopPropagation(); selectProfile(profile.id); }}>Edit</button></td>
                      </tr>
                      {activeProfileId === profile.id && profileMode === "edit" ? <tr className="liquid-ops-inline-editor-row"><td><div className="liquid-ops-inline-stack"><input className="liquid-ops-input liquid-ops-table-input" value={profileDraft.name} onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))} /><input className="liquid-ops-input liquid-ops-table-input" value={profileDraft.profileKey} onChange={(event) => setProfileDraft((current) => ({ ...current, profileKey: event.target.value }))} /></div></td><td><div className="liquid-ops-inline-trait-builder">{profileDraft.traits.map((row, index) => <div key={`profile-edit-${index}`} className="liquid-ops-inline-trait-row"><select className="liquid-ops-input liquid-ops-table-input" value={row.traitKey} onChange={(event) => updateProfileTrait(index, { traitKey: event.target.value })}><option value="">Trait</option>{traits.map((trait) => <option key={trait.id} value={trait.traitKey}>{trait.label}</option>)}</select><input className="liquid-ops-input liquid-ops-table-input" value={row.value} onChange={(event) => updateProfileTrait(index, { value: event.target.value })} /><button className="btn btn-ghost btn-sm" type="button" onClick={() => removeProfileTraitRow(index)}>Remove</button></div>)}<button className="btn btn-ghost btn-sm" type="button" onClick={addProfileTraitRow}>Add trait value</button></div></td><td><input className="liquid-ops-input liquid-ops-table-input" value={profileDraft.description} onChange={(event) => setProfileDraft((current) => ({ ...current, description: event.target.value }))} /></td><td><select className="liquid-ops-input liquid-ops-table-input" value={profileDraft.enabled ? "active" : "paused"} onChange={(event) => setProfileDraft((current) => ({ ...current, enabled: event.target.value === "active" }))}><option value="active">Active</option><option value="paused">Paused</option></select></td><td><div className="liquid-ops-inline-meta"><strong>{formatDate(profile.updatedAt)}</strong></div></td><td><div className="liquid-ops-row-actions liquid-ops-inline-row-actions"><button className="btn btn-primary btn-sm" type="button" onClick={saveProfile} disabled={busy === "profile"}>Save</button><button className="btn btn-ghost btn-sm" type="button" onClick={deleteProfile} disabled={busy === "profile-delete"}>Delete</button></div></td></tr> : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}

        {rulesTab === "variants" ? (
          <div className="liquid-ops-surface liquid-ops-stack">
            <div className="liquid-ops-toolbar liquid-ops-toolbar-inline">
              <SectionTitle title="Profile variants" body="Attach saved profiles to keys and override the fallback string for that audience." />
              <label className="liquid-ops-inline-field"><span>Focus key</span><select value={activeKeyId ?? ""} onChange={(event) => selectKey(event.target.value || null, "edit")}>{keys.map((key) => <option key={key.id} value={key.id}>{key.key}</option>)}</select></label>
            </div>
            {variantMode === "create" ? <section className="liquid-ops-inline-create-card"><div className="liquid-ops-inline-create-grid liquid-ops-rules-create-grid-variants"><label className="liquid-ops-inline-create-field"><span>Key</span><select className="liquid-ops-input liquid-ops-table-input" value={variantDraft.keyId} onChange={(event) => setVariantDraft((current) => ({ ...current, keyId: event.target.value }))}><option value="">Choose key</option>{keys.map((key) => <option key={key.id} value={key.id}>{key.key}</option>)}</select></label><label className="liquid-ops-inline-create-field"><span>Profile</span><select className="liquid-ops-input liquid-ops-table-input" value={variantDraft.profileId} onChange={(event) => setVariantDraft((current) => ({ ...current, profileId: event.target.value }))}><option value="">Choose profile</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label><label className="liquid-ops-inline-create-field"><span>Resolved copy</span><input className="liquid-ops-input liquid-ops-table-input" value={variantDraft.text} onChange={(event) => setVariantDraft((current) => ({ ...current, text: event.target.value }))} placeholder="Continue to payment" /></label><label className="liquid-ops-inline-create-field"><span>Locale</span><input className="liquid-ops-input liquid-ops-table-input" value={variantDraft.locale} onChange={(event) => setVariantDraft((current) => ({ ...current, locale: event.target.value }))} placeholder="en" /></label><label className="liquid-ops-inline-create-field"><span>Status</span><select className="liquid-ops-input liquid-ops-table-input" value={variantDraft.enabled ? "ready" : "paused"} onChange={(event) => setVariantDraft((current) => ({ ...current, enabled: event.target.value === "ready" }))}><option value="ready">Draft ready</option><option value="paused">Paused</option></select></label><div className="liquid-ops-row-actions liquid-ops-inline-row-actions"><button className="btn btn-primary btn-sm" type="button" onClick={saveVariant} disabled={busy === "variant"}>Create</button></div></div></section> : null}
            {variantRows.length === 0 ? <EmptyState title="No variants yet" body="Create a profile-specific variant when a saved audience should see copy different from the fallback." /> : (
              <table className="data-table liquid-ops-table">
                <thead><tr><th>Key</th><th>Profile</th><th>Resolved copy</th><th>Locale</th><th>Status</th><th>Updated</th><th /></tr></thead>
                <tbody>
                  {variantRows.map(({ key, detail, variant, profile }) => (
                    <Fragment key={variant.id}>
                      <tr className={selectedVariantId === variant.id ? "liquid-ops-row-active" : undefined} onClick={() => { selectVariant(key.id, variant.segmentId ?? null, variant.id); clearMessages(); }}>
                        <td>{key.key}</td><td>{profile?.name ?? "Removed profile"}</td><td className="liquid-ops-copy-cell">{variant.content.text}</td><td>{variant.locale ?? detail?.defaultLocale ?? "en"}</td><td><Tag tone={variant.enabled ? "green" : "amber"}>{variant.enabled ? "Draft ready" : "Paused"}</Tag></td><td>{formatDate(variant.updatedAt)}</td><td><button className="btn btn-ghost btn-sm" type="button" onClick={(event) => { event.stopPropagation(); selectVariant(key.id, variant.segmentId ?? null, variant.id); }}>Edit</button></td>
                      </tr>
                      {selectedVariantId === variant.id && variantMode === "edit" ? <tr className="liquid-ops-inline-editor-row"><td><select className="liquid-ops-input liquid-ops-table-input" value={variantDraft.keyId} onChange={(event) => setVariantDraft((current) => ({ ...current, keyId: event.target.value }))}>{keys.map((item) => <option key={item.id} value={item.id}>{item.key}</option>)}</select></td><td><select className="liquid-ops-input liquid-ops-table-input" value={variantDraft.profileId} onChange={(event) => setVariantDraft((current) => ({ ...current, profileId: event.target.value }))}>{profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></td><td><input className="liquid-ops-input liquid-ops-table-input" value={variantDraft.text} onChange={(event) => setVariantDraft((current) => ({ ...current, text: event.target.value }))} /></td><td><input className="liquid-ops-input liquid-ops-table-input" value={variantDraft.locale} onChange={(event) => setVariantDraft((current) => ({ ...current, locale: event.target.value }))} /></td><td><select className="liquid-ops-input liquid-ops-table-input" value={variantDraft.enabled ? "ready" : "paused"} onChange={(event) => setVariantDraft((current) => ({ ...current, enabled: event.target.value === "ready" }))}><option value="ready">Draft ready</option><option value="paused">Paused</option></select></td><td><div className="liquid-ops-inline-meta"><strong>{profile?.name ?? "Profile"}</strong><span>{getDraftDefaultVariant(detail)?.content.text ?? "No fallback"}</span></div></td><td><div className="liquid-ops-row-actions liquid-ops-inline-row-actions"><button className="btn btn-primary btn-sm" type="button" onClick={saveVariant} disabled={busy === "variant"}>Save</button><button className="btn btn-ghost btn-sm" type="button" onClick={deleteVariant} disabled={busy === "variant-delete"}>Delete</button></div></td></tr> : null}
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
            body="Review every key before it ships. Publish when draft copy is ready, or demote a live key back to draft immediately."
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
                <div key={key.id} className={`liquid-ops-stage-row ${activeKeyId === key.id ? "active" : ""}`} onClick={() => selectKey(key.id, "edit")}>
                  <div className="liquid-ops-stage-row-top">
                    <div>
                      <div className="heading">{key.key}</div>
                      <div className="panel-copy">{getScreenKey(detail) || "Unassigned screen"} · {state}</div>
                    </div>
                    <div className="liquid-ops-row-actions">
                      <Tag tone={keyStateTone(state)}>{state}</Tag>
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
                  </div>

                  {profileVariants.length > 0 ? (
                    <div className="liquid-ops-chip-row">
                      {profileVariants.map((variant) => {
                        const profile = profiles.find((item) => item.id === variant.segmentId);
                        return <Tag key={variant.id}>{profile?.name ?? "Removed profile"} · {variant.content.text}</Tag>;
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderAnalyticsTab() {
    return (
      <div className="liquid-ops-stage liquid-ops-stack">
        <div className="liquid-ops-toolbar">
          <SectionTitle
            title="Modeled Liquid analytics"
            body="This analytics surface is ready for real Liquid attribution. Until backend attribution is wired, the figures below are modeled from the current key and profile configuration."
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
          <Tag tone="amber">Modeled data</Tag>
          <span>Use this to understand the shape of Liquid reporting now. Swap in real attribution later without changing the information architecture.</span>
        </div>

        {metricRows.length === 0 ? (
          <EmptyState title="No analytics yet" body="Once keys exist, Liquid analytics will compare fallback copy and profile-specific variants side by side." />
        ) : (
          <>
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
                  </tr>
                </thead>
                <tbody>
                  {metricRows.map((row) => (
                    <tr key={row.keyId} className={activeKeyId === row.keyId ? "liquid-ops-row-active" : undefined} onClick={() => selectKey(row.keyId, "edit")}>
                      <td>{row.key}</td>
                      <td>{row.screen}</td>
                      <td>{formatNumber(row.exposures)}</td>
                      <td>{formatPercent(row.defaultRate)}</td>
                      <td>{formatPercent(row.liquidRate)}</td>
                      <td className={row.lift >= 0 ? "liquid-ops-positive" : "liquid-ops-negative"}>{row.lift >= 0 ? "+" : ""}{formatPercent(row.lift)}</td>
                      <td>{row.winner}</td>
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
          </>
        )}
      </div>
    );
  }

  function renderInspector() {
    if (activeTab === "keys" || activeTab === "rules") {
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

    const analyticsDetail = selectedKeyDetail;
    const analyticsRow = metricRows.find((row) => row.keyId === activeKeyId) ?? metricRows[0] ?? null;
    return (
      <section className="liquid-ops-inspector">
        <SectionTitle title="Analytics context" body="Keep one key in focus while you compare fallback performance, Liquid lift, and profile coverage." />
        {!analyticsRow ? (
          <EmptyState title="No analytics in view" body="Create a few keys and profiles to populate the analytics workspace." />
        ) : (
          <>
            <div className="liquid-ops-inspector-meta">
              <div><span>Key</span><strong>{analyticsRow.key}</strong></div>
              <div><span>Screen</span><strong>{analyticsRow.screen}</strong></div>
              <div><span>Exposures</span><strong>{formatNumber(analyticsRow.exposures)}</strong></div>
              <div><span>Lift</span><strong>{analyticsRow.lift >= 0 ? "+" : ""}{formatPercent(analyticsRow.lift)}</strong></div>
            </div>
            <div className="liquid-ops-context-block"><strong>Fallback copy</strong><span>{getDraftDefaultVariant(analyticsDetail)?.content.text ?? "Not configured"}</span></div>
            <div className="liquid-ops-context-block"><strong>Profile coverage</strong><span>{analyticsDetail?.variants.filter((variant) => variant.stage === "draft" && variant.segmentId).length ?? 0} profile-specific variants attached</span></div>
          </>
        )}
      </section>
    );
  }

  return (
    <div className="liquid-ops-shell">
      <div className="liquid-ops-main">
        <div className="liquid-ops-tabs">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => startTransition(() => setActiveTab(tab.id))}>
              {tab.label}
            </button>
          ))}
        </div>

        {notice ? <div className="liquid-ops-banner success">{notice}</div> : null}
        {error ? <div className="liquid-ops-banner error">{error}</div> : null}

        {activeTab === "staging" || activeTab === "analytics" ? (
          <div className="liquid-ops-editor-zone">
            <div className="liquid-ops-editor-head">
              <span>{activeTab === "staging" ? "Selected staging context" : "Selected analytics context"}</span>
              <p className="panel-copy">
                {activeTab === "staging"
                  ? "Review the selected key and decide whether it should stay draft or move live."
                  : "Use the selected key context to compare fallback copy, profile coverage, and modeled lift."}
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
