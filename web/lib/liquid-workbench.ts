import type {
  LiquidBundleResolve,
  LiquidExperiment,
  LiquidKeyDetail,
  LiquidKeySummary,
  LiquidRule,
  LiquidSegment,
  LiquidVariant,
} from "@/lib/service-gateway";

export type LiquidWorkbenchTab = "keys" | "rules" | "preview" | "analytics";
export type LiquidOperatingStatus = "draft" | "live" | "paused" | "archived";

export type LiquidContentKeyRow = {
  id: string;
  key: string;
  label: string;
  surface: string;
  defaultCopy: string;
  type: "text";
  locales: string[];
  ruleCount: number;
  experimentCount: number;
  status: Exclude<LiquidOperatingStatus, "archived">;
  updatedAt: string;
  updatedLabel: string;
  publishedRevision: number;
  detail: LiquidKeyDetail | null;
};

export type LiquidRuleRow = {
  id: string;
  keyId: string;
  key: string;
  surface: string;
  defaultText: string;
  segment: string | null;
  locale: string | null;
  conditionLabel: string;
  resolvedText: string;
  priority: number;
  status: Exclude<LiquidOperatingStatus, "archived">;
  updatedAt: string;
  updatedLabel: string;
  variant: LiquidVariant;
};

export type LiquidAnalyticsRow = {
  id: string;
  keyId: string;
  key: string;
  surface: string;
  status: Exclude<LiquidOperatingStatus, "archived">;
  exposures: number;
  clicks: number;
  completions: number;
  ctr: number;
  lift: number;
  topVariant: string | null;
  trend: number[];
};

export type LiquidRulePerformanceRow = {
  id: string;
  key: string;
  label: string;
  exposures: number;
  ctr: number;
  lift: number;
};

type LiquidPreviewItem = LiquidBundleResolve["items"][number];

export function parseJsonSafely(value: string): unknown | null {
  if (!value.trim()) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function toDisplayLabel(key: string): string {
  const cleaned = key.split(/[./_-]/g).filter(Boolean);
  if (cleaned.length === 0) {
    return "New key";
  }
  return cleaned
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) {
    return "Not updated";
  }
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) {
    return "Not updated";
  }
  const diff = target - Date.now();
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(diff) >= size || unit === "minute") {
      return formatter.format(Math.round(diff / size), unit);
    }
  }
  return "Just now";
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "Not published yet";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not published yet";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number, maximumFractionDigits = 0): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value)}%`;
}

export function buildCoverageTrend(seed: number): number[] {
  return Array.from({ length: 7 }, (_, index) => {
    const baseline = 38 + ((seed + index * 11) % 18);
    return baseline + index * 4;
  });
}

export function buildContentKeyRows(
  keys: LiquidKeySummary[],
  keyDetailsById: Record<string, LiquidKeyDetail>,
): LiquidContentKeyRow[] {
  return keys.map((key) => {
    const detail = keyDetailsById[key.id] ?? null;
    const defaultVariant = getDefaultVariant(detail);
    const locales = getLocales(detail, key.defaultLocale);
    const bundleNames = detail?.bundles.map((bundle) => bundle.screenKey) ?? [];
    const surface = bundleNames.length > 0
      ? bundleNames.length > 1
        ? `${bundleNames[0]} +${bundleNames.length - 1}`
        : bundleNames[0]
      : key.namespace ?? "Unassigned";
    const ruleCount = detail
      ? collapseVariants(detail).filter(({ selected }) => isRuleVariant(selected, detail.defaultLocale)).length
      : Math.max(0, key.draftVariantCount - 1);
    const experimentCount = detail
      ? new Set(
        collapseVariants(detail)
          .map(({ selected }) => selected.experimentId)
          .filter((value): value is string => Boolean(value)),
      ).size
      : 0;

    return {
      id: key.id,
      key: key.key,
      label: detail?.label ?? key.label,
      surface,
      defaultCopy: defaultVariant?.content.text?.trim() || "No default copy yet",
      type: "text",
      locales,
      ruleCount,
      experimentCount,
      status: deriveKeyStatus(key),
      updatedAt: detail?.draftUpdatedAt ?? key.updatedAt,
      updatedLabel: formatRelativeTime(detail?.draftUpdatedAt ?? key.updatedAt),
      publishedRevision: key.publishedRevision,
      detail,
    };
  });
}

export function buildRuleRows(
  keyRows: LiquidContentKeyRow[],
  segments: LiquidSegment[],
  rules: LiquidRule[],
  experiments: LiquidExperiment[],
): LiquidRuleRow[] {
  const segmentById = new Map(segments.map((item) => [item.id, item]));
  const ruleById = new Map(rules.map((item) => [item.id, item]));
  const experimentById = new Map(experiments.map((item) => [item.id, item]));

  return keyRows.flatMap((row) => {
    const detail = row.detail;
    if (!detail) {
      return [];
    }

    return collapseVariants(detail)
      .filter(({ selected }) => isRuleVariant(selected, detail.defaultLocale))
      .map(({ selected, draft, published }) => {
        const segment = selected.segmentId ? segmentById.get(selected.segmentId)?.name ?? null : null;
        const locale = selected.locale ?? detail.defaultLocale ?? row.locales[0] ?? "en";
        const rule = selected.ruleId ? ruleById.get(selected.ruleId) : null;
        const experiment = selected.experimentId ? experimentById.get(selected.experimentId) : null;

        return {
          id: selected.id,
          keyId: row.id,
          key: row.key,
          surface: row.surface,
          defaultText: getDefaultVariant(detail)?.content.text?.trim() || "No default copy yet",
          segment,
          locale,
          conditionLabel: describeRuleCondition(selected, rule?.name ?? null, experiment?.name ?? null, detail.defaultLocale),
          resolvedText: selected.content.text?.trim() || "No resolved text set",
          priority: selected.priority,
          status: deriveRuleStatus(selected, row.status, draft, published),
          updatedAt: selected.updatedAt,
          updatedLabel: formatRelativeTime(selected.updatedAt),
          variant: selected,
        };
      });
  }).sort((left, right) => {
    if (left.status !== right.status) {
      return statusSort(left.status) - statusSort(right.status);
    }
    return right.priority - left.priority;
  });
}

export function buildAnalyticsRows(
  keyRows: LiquidContentKeyRow[],
  ruleRows: LiquidRuleRow[],
): LiquidAnalyticsRow[] {
  return keyRows.map((row) => {
    const keySeed = numericSeed(row.key);
    const exposures = 1400 + (keySeed % 6400);
    const ctr = 2.2 + ((numericSeed(`${row.key}:ctr`) % 68) / 10);
    const clicks = Math.round(exposures * (ctr / 100));
    const completionRate = 0.42 + ((numericSeed(`${row.key}:complete`) % 38) / 100);
    const completions = Math.round(clicks * completionRate);
    const lift = ((numericSeed(`${row.key}:lift`) % 240) - 70) / 10;
    const relatedRules = ruleRows.filter((item) => item.keyId === row.id);

    return {
      id: row.id,
      keyId: row.id,
      key: row.key,
      surface: row.surface,
      status: row.status,
      exposures,
      clicks,
      completions,
      ctr,
      lift,
      topVariant: relatedRules[0]?.resolvedText ?? null,
      trend: Array.from({ length: 7 }, (_, index) => 32 + ((keySeed + index * 13) % 42)),
    };
  }).sort((left, right) => right.exposures - left.exposures);
}

export function buildRulePerformanceRows(ruleRows: LiquidRuleRow[]): LiquidRulePerformanceRow[] {
  return ruleRows.map((row) => {
    const seed = numericSeed(`${row.key}:${row.id}`);
    return {
      id: row.id,
      key: row.key,
      label: row.resolvedText,
      exposures: 700 + (seed % 4200),
      ctr: 1.8 + ((numericSeed(`${row.id}:ctr`) % 72) / 10),
      lift: ((numericSeed(`${row.id}:lift`) % 190) - 40) / 10,
    };
  });
}

export function buildPreviewFallback(
  screenKey: string,
  locale: string,
  segmentId: string | null,
  keyRows: LiquidContentKeyRow[],
): LiquidBundleResolve | null {
  if (!screenKey) {
    return null;
  }

  const matchingRows = keyRows.filter((row) =>
    row.detail?.bundles.some((bundle) => bundle.screenKey === screenKey),
  );

  if (matchingRows.length === 0) {
    return null;
  }

  const items: LiquidPreviewItem[] = [];
  for (const row of matchingRows) {
    const detail = row.detail;
    if (!detail) {
      continue;
    }
    const variant = pickPreviewVariant(detail, locale, segmentId);
    if (!variant) {
      continue;
    }
    items.push({
      key: row.key,
      text: variant.content.text,
      icon: variant.content.icon,
      visibility: variant.content.visibility,
      emphasis: variant.content.emphasis,
      ordering: variant.content.ordering,
      locale: variant.locale ?? detail.defaultLocale,
      source: variant.experimentId
        ? "experiment"
        : variant.ruleId
          ? "rule"
          : variant.segmentId
            ? "segment"
            : "default",
      experiment: null,
    });
  }
  items.sort((left, right) => left.ordering - right.ordering);

  return {
    screenKey,
    stage: "draft",
    revision: 0,
    etag: "local-preview",
    ttlSeconds: 60,
    generatedAt: new Date().toISOString(),
    items,
  };
}

export function detailToSummary(detail: LiquidKeyDetail): LiquidKeySummary {
  const draftVariants = detail.variants.filter((variant) => variant.stage === "draft");
  const publishedVariants = detail.variants.filter((variant) => variant.stage === "published");

  return {
    id: detail.id,
    key: detail.key,
    label: detail.label,
    description: detail.description,
    namespace: detail.namespace,
    defaultLocale: detail.defaultLocale,
    enabled: detail.enabled,
    draftVariantCount: draftVariants.length,
    publishedVariantCount: publishedVariants.length,
    bundleCount: detail.bundles.length,
    publishedRevision: detail.publishedRevision,
    publishedAt: detail.publishedAt,
    updatedAt: detail.draftUpdatedAt,
  };
}

export function listUniqueLocales(keyRows: LiquidContentKeyRow[]): string[] {
  return Array.from(
    new Set(
      keyRows.flatMap((row) => row.locales),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function numericSeed(value: string): number {
  return value.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
}

function deriveKeyStatus(key: LiquidKeySummary): Exclude<LiquidOperatingStatus, "archived"> {
  if (!key.enabled) {
    return "paused";
  }
  if (key.publishedRevision > 0) {
    return "live";
  }
  return "draft";
}

function deriveRuleStatus(
  variant: LiquidVariant,
  keyStatus: Exclude<LiquidOperatingStatus, "archived">,
  draft: LiquidVariant | undefined,
  published: LiquidVariant | undefined,
): Exclude<LiquidOperatingStatus, "archived"> {
  if (!variant.enabled || keyStatus === "paused") {
    return "paused";
  }
  if (!published) {
    return "draft";
  }
  if (draft && published && !sameVariantPayload(draft, published)) {
    return "draft";
  }
  return "live";
}

function sameVariantPayload(left: LiquidVariant, right: LiquidVariant): boolean {
  return JSON.stringify({
    locale: left.locale,
    content: left.content,
    segmentId: left.segmentId,
    ruleId: left.ruleId,
    experimentId: left.experimentId,
    experimentArm: left.experimentArm,
    priority: left.priority,
    enabled: left.enabled,
  }) === JSON.stringify({
    locale: right.locale,
    content: right.content,
    segmentId: right.segmentId,
    ruleId: right.ruleId,
    experimentId: right.experimentId,
    experimentArm: right.experimentArm,
    priority: right.priority,
    enabled: right.enabled,
  });
}

function describeRuleCondition(
  variant: LiquidVariant,
  ruleName: string | null,
  experimentName: string | null,
  defaultLocale: string,
): string {
  if (ruleName) {
    return ruleName;
  }
  if (experimentName) {
    return `${experimentName}${variant.experimentArm ? ` · ${variant.experimentArm}` : ""}`;
  }
  if (variant.segmentId) {
    return "Audience match";
  }
  if (variant.locale && variant.locale !== defaultLocale) {
    return "Locale override";
  }
  return "Manual override";
}

function getDefaultVariant(detail: LiquidKeyDetail | null): LiquidVariant | null {
  if (!detail) {
    return null;
  }
  return (
    detail.variants.find((variant) => variant.stage === "draft" && variant.isDefault) ??
    detail.variants.find((variant) => variant.stage === "published" && variant.isDefault) ??
    detail.variants.find((variant) => variant.stage === "draft") ??
    detail.variants[0] ??
    null
  );
}

function getLocales(detail: LiquidKeyDetail | null, fallbackLocale: string): string[] {
  if (!detail) {
    return [fallbackLocale];
  }
  return Array.from(
    new Set(
      detail.variants.map((variant) => variant.locale ?? detail.defaultLocale),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function collapseVariants(detail: LiquidKeyDetail): Array<{
  selected: LiquidVariant;
  draft?: LiquidVariant;
  published?: LiquidVariant;
}> {
  const groups = new Map<string, { draft?: LiquidVariant; published?: LiquidVariant }>();

  for (const variant of detail.variants) {
    const signature = [
      variant.locale ?? detail.defaultLocale,
      variant.segmentId ?? "",
      variant.ruleId ?? "",
      variant.experimentId ?? "",
      variant.experimentArm ?? "",
      variant.isDefault ? "1" : "0",
    ].join(":");
    const current = groups.get(signature) ?? {};
    current[variant.stage] = variant;
    groups.set(signature, current);
  }

  return Array.from(groups.values()).map((group) => ({
    selected: group.draft ?? group.published!,
    draft: group.draft,
    published: group.published,
  }));
}

function isRuleVariant(variant: LiquidVariant, defaultLocale: string): boolean {
  return Boolean(
    !variant.isDefault ||
    variant.segmentId ||
    variant.ruleId ||
    variant.experimentId ||
    (variant.locale && variant.locale !== defaultLocale),
  );
}

function pickPreviewVariant(detail: LiquidKeyDetail, locale: string, segmentId: string | null): LiquidVariant | null {
  const draftVariants = detail.variants.filter((variant) => variant.stage === "draft" && variant.enabled);
  const localizedSegmentVariant = draftVariants
    .filter((variant) => variant.segmentId === segmentId && (variant.locale ?? detail.defaultLocale) === locale)
    .sort((left, right) => right.priority - left.priority)[0];
  if (localizedSegmentVariant) {
    return localizedSegmentVariant;
  }

  const localizedVariant = draftVariants
    .filter((variant) => !variant.segmentId && !variant.ruleId && !variant.experimentId && (variant.locale ?? detail.defaultLocale) === locale)
    .sort((left, right) => Number(right.isDefault) - Number(left.isDefault))[0];
  if (localizedVariant) {
    return localizedVariant;
  }

  return getDefaultVariant(detail);
}

function statusSort(status: Exclude<LiquidOperatingStatus, "archived">): number {
  switch (status) {
    case "draft":
      return 0;
    case "live":
      return 1;
    case "paused":
      return 2;
    default:
      return 3;
  }
}
