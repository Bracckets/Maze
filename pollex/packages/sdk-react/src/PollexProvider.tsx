import { createContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";

import { PollexClient } from "@pollex/sdk-js";
import type { JsonRecord } from "@pollex/sdk-js";

export interface PollexProviderProps {
  apiKey: string;
  apiBaseUrl: string;
  client?: PollexClient;
  userId: string;
  anonymousId?: string;
  traits?: JsonRecord;
  debug?: boolean;
  children: ReactNode;
}

export interface PollexContextValue {
  client: PollexClient;
  userId: string;
  anonymousId?: string;
  traits: JsonRecord;
  debug: boolean;
}

export const PollexContext = createContext<PollexContextValue | null>(null);

export function PollexProvider({
  apiKey,
  apiBaseUrl,
  client: providedClient,
  userId,
  anonymousId,
  traits = {},
  debug = false,
  children
}: PollexProviderProps) {
  const client = useMemo(() => providedClient ?? new PollexClient({ apiKey, apiBaseUrl }), [apiKey, apiBaseUrl, providedClient]);
  const traitsKey = JSON.stringify(traits);

  useEffect(() => {
    void client.identify({
      subject_id: userId,
      anonymous_id: anonymousId,
      traits
    });
  }, [anonymousId, client, traitsKey, userId]);

  const value = useMemo(
    () => ({
      client,
      userId,
      anonymousId,
      traits,
      debug
    }),
    [anonymousId, client, debug, traitsKey, userId]
  );

  return <PollexContext.Provider value={value}>{children}</PollexContext.Provider>;
}
