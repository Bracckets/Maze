import type {
  LiquidBundleSummary,
  LiquidExperiment,
  LiquidKeyDetail,
  LiquidKeySummary,
  LiquidOverview,
  LiquidRule,
  LiquidSegment,
  LiquidVariant,
} from "@/lib/service-gateway";
import { detailToSummary } from "@/lib/liquid-workbench";

type LiquidDemoState = {
  overview: LiquidOverview;
  keys: LiquidKeySummary[];
  keyDetails: LiquidKeyDetail[];
  bundles: LiquidBundleSummary[];
  segments: LiquidSegment[];
  rules: LiquidRule[];
  experiments: LiquidExperiment[];
};

type VariantOptions = Partial<Pick<LiquidVariant, "segmentId" | "segmentKey" | "ruleId" | "ruleKey" | "experimentId" | "experimentKey" | "experimentArm" | "priority" | "isDefault" | "enabled">>;

function makeVariant(
  id: string,
  stage: "draft" | "published",
  locale: string | null,
  text: string,
  updatedAt: string,
  options: VariantOptions = {},
): LiquidVariant {
  return {
    id,
    stage,
    locale,
    content: {
      text,
      icon: null,
      visibility: "visible",
      emphasis: "medium",
      ordering: 0,
    },
    segmentId: options.segmentId ?? null,
    segmentKey: options.segmentKey ?? null,
    ruleId: options.ruleId ?? null,
    ruleKey: options.ruleKey ?? null,
    experimentId: options.experimentId ?? null,
    experimentKey: options.experimentKey ?? null,
    experimentArm: options.experimentArm ?? null,
    trafficPercentage: 100,
    priority: options.priority ?? 100,
    isDefault: options.isDefault ?? false,
    enabled: options.enabled ?? true,
    updatedAt,
  };
}

function makeBundleSummary(
  id: string,
  screenKey: string,
  label: string,
  keyDetails: LiquidKeyDetail[],
): LiquidBundleSummary {
  const matching = keyDetails.filter((detail) => detail.bundles.some((bundle) => bundle.id === id));
  return {
    id,
    screenKey,
    label,
    description: null,
    enabled: true,
    draftKeyCount: matching.length,
    publishedKeyCount: matching.filter((detail) => detail.publishedRevision > 0).length,
    publishedRevision: 1,
    publishedAt: "2026-04-12T18:20:00.000Z",
    updatedAt: "2026-04-13T10:40:00.000Z",
  };
}

export function buildLiquidDemoState(): LiquidDemoState {
  const segments: LiquidSegment[] = [
    {
      id: "segment-power-users",
      segmentKey: "power_users",
      name: "Power users",
      description: "Users with repeated high-value sessions and fast checkout completion.",
      conditions: {
        all: [
          { field: "plan", operator: "eq", value: "growth" },
          { field: "sessions_30d", operator: "gte", value: 8 },
        ],
        any: [],
      },
      enabled: true,
      updatedAt: "2026-04-12T14:30:00.000Z",
    },
    {
      id: "segment-new-users",
      segmentKey: "new_users",
      name: "New users",
      description: "People in their first three sessions.",
      conditions: {
        all: [{ field: "sessions_30d", operator: "lte", value: 3 }],
        any: [],
      },
      enabled: true,
      updatedAt: "2026-04-11T18:10:00.000Z",
    },
    {
      id: "segment-churn-risk",
      segmentKey: "churn_risk",
      name: "Churn risk",
      description: "Users with falling activity or abandoned onboarding.",
      conditions: {
        all: [{ field: "completion_rate", operator: "lt", value: 0.4 }],
        any: [{ field: "days_since_last_open", operator: "gte", value: 7 }],
      },
      enabled: true,
      updatedAt: "2026-04-10T16:00:00.000Z",
    },
  ];

  const rules: LiquidRule[] = [
    {
      id: "rule-checkout-ready",
      ruleKey: "checkout_ready",
      name: "Ready to buy",
      description: "Show a shorter CTA when intent is already strong.",
      conditions: {
        all: [{ field: "checkout_intent", operator: "gte", value: 0.82 }],
        any: [],
      },
      priority: 210,
      enabled: true,
      updatedAt: "2026-04-12T15:00:00.000Z",
    },
    {
      id: "rule-cart-value",
      ruleKey: "high_cart_value",
      name: "High cart value",
      description: "Adjust copy for carts above the premium threshold.",
      conditions: {
        all: [{ field: "cart_value", operator: "gte", value: 150 }],
        any: [],
      },
      priority: 180,
      enabled: true,
      updatedAt: "2026-04-12T16:40:00.000Z",
    },
    {
      id: "rule-onboarding-lapse",
      ruleKey: "onboarding_lapse",
      name: "Stalled onboarding",
      description: "Encourage progress when onboarding stalls.",
      conditions: {
        all: [{ field: "completed_steps", operator: "lt", value: 2 }],
        any: [],
      },
      priority: 170,
      enabled: true,
      updatedAt: "2026-04-11T11:00:00.000Z",
    },
  ];

  const experiments: LiquidExperiment[] = [
    {
      id: "experiment-checkout-cta",
      experimentKey: "checkout_cta_test",
      name: "Checkout CTA test",
      description: "Compare shorter and directional checkout prompts.",
      status: "active",
      trafficAllocation: 50,
      seed: "maze-checkout-1",
      updatedAt: "2026-04-13T09:40:00.000Z",
    },
    {
      id: "experiment-onboarding-title",
      experimentKey: "onboarding_title_test",
      name: "Onboarding welcome title",
      description: "Test benefit-led onboarding headlines.",
      status: "active",
      trafficAllocation: 35,
      seed: "maze-onboarding-1",
      updatedAt: "2026-04-12T21:00:00.000Z",
    },
    {
      id: "experiment-cart-header",
      experimentKey: "cart_header_refresh",
      name: "Cart header refresh",
      description: "Evaluate a warmer cart header treatment.",
      status: "paused",
      trafficAllocation: 20,
      seed: "maze-cart-1",
      updatedAt: "2026-04-11T17:20:00.000Z",
    },
    {
      id: "experiment-feedback-label",
      experimentKey: "feedback_prompt_test",
      name: "Feedback prompt test",
      description: "Draft experiment for support feedback prompts.",
      status: "draft",
      trafficAllocation: 20,
      seed: "maze-feedback-1",
      updatedAt: "2026-04-10T13:00:00.000Z",
    },
  ];

  const keyDetails: LiquidKeyDetail[] = [
    {
      id: "key-checkout-primary-cta",
      key: "checkout.primary.cta",
      label: "Checkout primary CTA",
      description: "Primary action on the checkout payment step.",
      namespace: "checkout",
      defaultLocale: "en",
      enabled: true,
      publishedRevision: 4,
      publishedAt: "2026-04-12T18:20:00.000Z",
      draftUpdatedAt: "2026-04-13T10:40:00.000Z",
      bundles: [
        { id: "bundle-checkout", screenKey: "checkout", label: "Checkout", orderIndex: 0, enabled: true },
      ],
      variants: [
        makeVariant("variant-checkout-default-en-draft", "draft", "en", "Continue to payment", "2026-04-13T10:40:00.000Z", { isDefault: true }),
        makeVariant("variant-checkout-default-en-published", "published", "en", "Continue to payment", "2026-04-12T18:20:00.000Z", { isDefault: true }),
        makeVariant("variant-checkout-es-draft", "draft", "es", "Continuar al pago", "2026-04-13T10:15:00.000Z"),
        makeVariant("variant-checkout-es-published", "published", "es", "Continuar al pago", "2026-04-12T18:20:00.000Z"),
        makeVariant("variant-checkout-segment-draft", "draft", "en", "Continue", "2026-04-13T10:30:00.000Z", {
          segmentId: "segment-power-users",
          segmentKey: "power_users",
          ruleId: "rule-checkout-ready",
          ruleKey: "checkout_ready",
          priority: 210,
        }),
        makeVariant("variant-checkout-segment-published", "published", "en", "Continue", "2026-04-12T18:20:00.000Z", {
          segmentId: "segment-power-users",
          segmentKey: "power_users",
          ruleId: "rule-checkout-ready",
          ruleKey: "checkout_ready",
          priority: 210,
        }),
        makeVariant("variant-checkout-exp-draft", "draft", "en", "Next", "2026-04-13T09:50:00.000Z", {
          experimentId: "experiment-checkout-cta",
          experimentKey: "checkout_cta_test",
          experimentArm: "arm_b",
          priority: 230,
        }),
        makeVariant("variant-checkout-exp-published", "published", "en", "Next", "2026-04-12T18:20:00.000Z", {
          experimentId: "experiment-checkout-cta",
          experimentKey: "checkout_cta_test",
          experimentArm: "arm_b",
          priority: 230,
        }),
      ],
    },
    {
      id: "key-cart-header",
      key: "cart.header",
      label: "Cart header",
      description: "Header text for the cart surface.",
      namespace: "cart",
      defaultLocale: "en",
      enabled: true,
      publishedRevision: 2,
      publishedAt: "2026-04-12T17:15:00.000Z",
      draftUpdatedAt: "2026-04-13T09:05:00.000Z",
      bundles: [
        { id: "bundle-cart", screenKey: "cart", label: "Cart", orderIndex: 0, enabled: true },
      ],
      variants: [
        makeVariant("variant-cart-default-en-draft", "draft", "en", "Your cart", "2026-04-13T09:05:00.000Z", { isDefault: true }),
        makeVariant("variant-cart-default-en-published", "published", "en", "Your cart", "2026-04-12T17:15:00.000Z", { isDefault: true }),
        makeVariant("variant-cart-fr-draft", "draft", "fr", "Votre panier", "2026-04-13T08:45:00.000Z"),
        makeVariant("variant-cart-fr-published", "published", "fr", "Votre panier", "2026-04-12T17:15:00.000Z"),
        makeVariant("variant-cart-rule-draft", "draft", "en", "Ready to finish your order?", "2026-04-13T08:55:00.000Z", {
          segmentId: "segment-power-users",
          segmentKey: "power_users",
          ruleId: "rule-cart-value",
          ruleKey: "high_cart_value",
          priority: 180,
        }),
        makeVariant("variant-cart-rule-published", "published", "en", "Ready to finish your order?", "2026-04-12T17:15:00.000Z", {
          segmentId: "segment-power-users",
          segmentKey: "power_users",
          ruleId: "rule-cart-value",
          ruleKey: "high_cart_value",
          priority: 180,
        }),
      ],
    },
    {
      id: "key-onboarding-welcome-title",
      key: "onboarding.welcome_title",
      label: "Onboarding welcome title",
      description: "Title shown on the first onboarding screen.",
      namespace: "onboarding",
      defaultLocale: "en",
      enabled: true,
      publishedRevision: 3,
      publishedAt: "2026-04-12T16:10:00.000Z",
      draftUpdatedAt: "2026-04-13T08:35:00.000Z",
      bundles: [
        { id: "bundle-onboarding", screenKey: "onboarding", label: "Onboarding", orderIndex: 0, enabled: true },
      ],
      variants: [
        makeVariant("variant-welcome-title-default-en-draft", "draft", "en", "Welcome to the app!", "2026-04-13T08:35:00.000Z", { isDefault: true }),
        makeVariant("variant-welcome-title-default-en-published", "published", "en", "Welcome to the app!", "2026-04-12T16:10:00.000Z", { isDefault: true }),
        makeVariant("variant-welcome-title-es-draft", "draft", "es", "Bienvenido a la app", "2026-04-13T08:20:00.000Z"),
        makeVariant("variant-welcome-title-es-published", "published", "es", "Bienvenido a la app", "2026-04-12T16:10:00.000Z"),
        makeVariant("variant-welcome-title-exp-draft", "draft", "en", "Get set up faster", "2026-04-13T08:22:00.000Z", {
          experimentId: "experiment-onboarding-title",
          experimentKey: "onboarding_title_test",
          experimentArm: "arm_a",
          priority: 190,
        }),
        makeVariant("variant-welcome-title-exp-published", "published", "en", "Get set up faster", "2026-04-12T16:10:00.000Z", {
          experimentId: "experiment-onboarding-title",
          experimentKey: "onboarding_title_test",
          experimentArm: "arm_a",
          priority: 190,
        }),
      ],
    },
    {
      id: "key-onboarding-welcome-body",
      key: "onboarding.welcome_body",
      label: "Onboarding welcome body",
      description: "Body copy that introduces onboarding.",
      namespace: "onboarding",
      defaultLocale: "en",
      enabled: true,
      publishedRevision: 2,
      publishedAt: "2026-04-12T16:10:00.000Z",
      draftUpdatedAt: "2026-04-13T08:05:00.000Z",
      bundles: [
        { id: "bundle-onboarding", screenKey: "onboarding", label: "Onboarding", orderIndex: 1, enabled: true },
      ],
      variants: [
        makeVariant("variant-welcome-body-default-en-draft", "draft", "en", "Thank you for joining. Let's get started.", "2026-04-13T08:05:00.000Z", { isDefault: true }),
        makeVariant("variant-welcome-body-default-en-published", "published", "en", "Thank you for joining. Let's get started.", "2026-04-12T16:10:00.000Z", { isDefault: true }),
        makeVariant("variant-welcome-body-fr-draft", "draft", "fr", "Merci de nous rejoindre. Commençons.", "2026-04-13T07:55:00.000Z"),
        makeVariant("variant-welcome-body-fr-published", "published", "fr", "Merci de nous rejoindre. Commençons.", "2026-04-12T16:10:00.000Z"),
        makeVariant("variant-welcome-body-rule-draft", "draft", "en", "We'll adapt each step based on what your users do.", "2026-04-13T07:58:00.000Z", {
          segmentId: "segment-new-users",
          segmentKey: "new_users",
          priority: 160,
        }),
        makeVariant("variant-welcome-body-rule-published", "published", "en", "We'll adapt each step based on what your users do.", "2026-04-12T16:10:00.000Z", {
          segmentId: "segment-new-users",
          segmentKey: "new_users",
          priority: 160,
        }),
      ],
    },
    {
      id: "key-onboarding-main-cta",
      key: "onboarding.main.cta",
      label: "Onboarding main CTA",
      description: "Primary CTA for onboarding progression.",
      namespace: "onboarding",
      defaultLocale: "en",
      enabled: true,
      publishedRevision: 1,
      publishedAt: "2026-04-11T12:20:00.000Z",
      draftUpdatedAt: "2026-04-13T07:40:00.000Z",
      bundles: [
        { id: "bundle-onboarding", screenKey: "onboarding", label: "Onboarding", orderIndex: 2, enabled: true },
      ],
      variants: [
        makeVariant("variant-main-cta-default-en-draft", "draft", "en", "Get started", "2026-04-13T07:40:00.000Z", { isDefault: true }),
        makeVariant("variant-main-cta-default-en-published", "published", "en", "Get started", "2026-04-11T12:20:00.000Z", { isDefault: true }),
        makeVariant("variant-main-cta-rule-draft", "draft", "en", "Finish setup", "2026-04-13T07:32:00.000Z", {
          segmentId: "segment-churn-risk",
          segmentKey: "churn_risk",
          ruleId: "rule-onboarding-lapse",
          ruleKey: "onboarding_lapse",
          priority: 170,
        }),
      ],
    },
    {
      id: "key-onboarding-feedback-input",
      key: "onboarding.cs_feedback_input",
      label: "Support feedback input",
      description: "Prompt used for onboarding support feedback.",
      namespace: "onboarding",
      defaultLocale: "en",
      enabled: false,
      publishedRevision: 0,
      publishedAt: null,
      draftUpdatedAt: "2026-04-13T07:10:00.000Z",
      bundles: [
        { id: "bundle-onboarding", screenKey: "onboarding", label: "Onboarding", orderIndex: 3, enabled: true },
      ],
      variants: [
        makeVariant("variant-feedback-default-en-draft", "draft", "en", "Tell us what felt unclear", "2026-04-13T07:10:00.000Z", {
          isDefault: true,
          enabled: false,
        }),
      ],
    },
  ];

  const keys = keyDetails.map((detail) => detailToSummary(detail));
  const bundles: LiquidBundleSummary[] = [
    makeBundleSummary("bundle-checkout", "checkout", "Checkout", keyDetails),
    makeBundleSummary("bundle-cart", "cart", "Cart", keyDetails),
    makeBundleSummary("bundle-onboarding", "onboarding", "Onboarding", keyDetails),
  ];

  return {
    overview: {
      keyCount: keys.length,
      bundleCount: bundles.length,
      publishedKeyCount: keys.filter((key) => key.publishedRevision > 0).length,
      publishedBundleCount: bundles.filter((bundle) => bundle.publishedRevision > 0).length,
      segmentCount: segments.length,
      activeExperimentCount: experiments.filter((experiment) => experiment.status === "active").length,
      runtimePath: "/liquid/resolve",
      cachePolicy: "60s edge cache",
    },
    keys,
    keyDetails,
    bundles,
    segments,
    rules,
    experiments,
  };
}
