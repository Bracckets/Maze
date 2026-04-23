# Pollex Web SDK

Browser SDK for Pollex telemetry batching and Liquid runtime resolution.

## Install

```bash
npm install @pollex/sdk
```

## Quick Start

```ts
import { Pollex } from "@pollex/sdk";

Pollex.configure({
  apiKey: "mz_live_...",
  endpoint: "https://api.example.com/events",
  appVersion: "1.0.0",
  sessionCaptureEnabled: true,
});

Pollex.screen("checkout_paywall");

Pollex.track("tap", {
  elementId: "primary_cta",
  x: 144,
  y: 420,
  metadata: {
    variant: "hero-a",
  },
});
```

## Liquid Runtime

```ts
import { Pollex } from "@pollex/sdk";

const bundle = await Pollex.resolveLiquidBundle({
  screen: "checkout_paywall",
  locale: "en-US",
  subjectId: "user-123",
  country: "US",
  traits: {
    "user.plan": "growth",
    "user.region": "na",
  },
});
```

## Next.js Example

```tsx
"use client";

import { useEffect } from "react";
import { Pollex } from "@pollex/sdk";

export function PollexBootstrap() {
  useEffect(() => {
    Pollex.configure({
      apiKey: process.env.NEXT_PUBLIC_POLLEX_API_KEY ?? "",
      endpoint: process.env.NEXT_PUBLIC_POLLEX_EVENTS_URL ?? "http://127.0.0.1:8000/events",
      appVersion: "1.0.0",
      sessionCaptureEnabled: true,
    });

    Pollex.screen("dashboard");
  }, []);

  return null;
}
```

## API

- `Pollex.configure(config)`
- `Pollex.screen(name)`
- `Pollex.track(event, options?)`
- `Pollex.flush()`
- `Pollex.resetSession()`
- `Pollex.resolveLiquidBundle(options)`
- `Pollex.clearLiquidCache()`

## Notes

- v1 is explicit-only. It does not auto-capture pageviews, clicks, or session replay.
- Optional screen-view screenshots can be enabled with `sessionCaptureEnabled`.
- The SDK sends events to `POST /events`, uploads screenshots to `POST /screenshots`, and resolves bundles with `POST /liquid/runtime/bundles/resolve`.
- Browser clients expose API keys by design. Treat these keys as publishable ingestion/runtime credentials rather than secrets.
- Your Pollex backend must allow the app origin through `CORS_ALLOW_ORIGINS`.
