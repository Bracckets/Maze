import { useEffect, useMemo, useState } from "react";

import type { AdaptationDecision, ElementConfig } from "@pollex/sdk-js";

import { usePollex } from "./usePollex";

export interface TactusDecisionState {
  adaptations: Record<string, unknown>;
  isAdapted: boolean;
  isFallback: boolean;
  reason: string;
  isLoading: boolean;
}

export function useTactusDecision(config: ElementConfig): TactusDecisionState {
  const { client, userId, anonymousId, traits, debug } = usePollex();
  const [state, setState] = useState<TactusDecisionState>(() => ({
    adaptations: config.defaultProps,
    isAdapted: false,
    isFallback: false,
    reason: "",
    isLoading: true
  }));
  const resolveKey = useMemo(
    () =>
      JSON.stringify({
        id: config.id,
        type: config.type,
        intent: config.intent,
        defaultProps: config.defaultProps,
        allow: config.allow,
        constraints: config.constraints ?? {},
        context: config.context ?? {},
        userId,
        anonymousId
      }),
    [anonymousId, config.allow, config.constraints, config.context, config.defaultProps, config.id, config.intent, config.type, userId]
  );

  useEffect(() => {
    let mounted = true;
    setState({
      adaptations: config.defaultProps,
      isAdapted: false,
      isFallback: false,
      reason: "",
      isLoading: true
    });

    void client
      .resolve({
        subject_id: userId,
        anonymous_id: anonymousId,
        element: {
          key: config.id,
          type: config.type,
          intent: config.intent,
          default_props: config.defaultProps
        },
        allow: config.allow,
        constraints: config.constraints,
        context: config.context,
        traits
      })
      .then((decision) => {
        if (!mounted) {
          return;
        }
        if (debug) {
          console.log("[Pollex] adaptation decision", decision);
        }
        setState(nextState(config.defaultProps, decision));
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }
        if (debug) {
          console.warn("[Pollex] adaptation fallback", error);
        }
        setState({
          adaptations: config.defaultProps,
          isAdapted: false,
          isFallback: true,
          reason: "Fallback rendered.",
          isLoading: false
        });
      });

    return () => {
      mounted = false;
    };
  }, [client, debug, resolveKey]);

  return state;
}

function nextState(defaultProps: Record<string, unknown>, decision: AdaptationDecision): TactusDecisionState {
  if (decision.fallback) {
    return {
      adaptations: defaultProps,
      isAdapted: false,
      isFallback: true,
      reason: decision.reason,
      isLoading: false
    };
  }

  const adaptations = { ...defaultProps, ...decision.adaptations };
  return {
    adaptations,
    isAdapted: Object.keys(decision.adaptations).length > 0,
    isFallback: false,
    reason: decision.reason,
    isLoading: false
  };
}
