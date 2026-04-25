# Pollex SDK Integration

Phase 2 ships two packages:

- `@pollex/sdk-js`: framework-agnostic TypeScript client for the Phase 1 Tactus API.
- `@pollex/sdk-react`: React provider, hooks, and safe UI wrappers.

## Install

```bash
npm install @pollex/sdk-js @pollex/sdk-react
```

Import the minimal stylesheet once:

```ts
import "@pollex/sdk-react/styles.css";
```

## React Setup

```tsx
import { PollexProvider, PollexButton } from "@pollex/sdk-react";

function App() {
  return (
    <PollexProvider
      apiKey="px_test_..."
      apiBaseUrl="http://localhost:8000"
      userId="user_123"
      anonymousId="anon_abc"
      traits={{ locale: "en" }}
    >
      <CheckoutPage />
    </PollexProvider>
  );
}

function CheckoutPage() {
  return (
    <PollexButton
      id="checkout.continue"
      intent="progress"
      allow={{ text: true, size: true, tooltip: true }}
      constraints={{ maxTextLength: 24, emoji: false }}
      context={{ page_type: "checkout", sensitive: false }}
      onClick={() => proceedToPayment()}
    >
      Continue
    </PollexButton>
  );
}
```

If the API is unavailable or slow, the SDK renders the default children and default props. Adaptations are applied only as safe semantic props and class names such as `pollex-size-lg`; the SDK never injects raw HTML or applies raw CSS from API responses.

## TypeScript Client

```ts
import { PollexClient } from "@pollex/sdk-js";

const client = new PollexClient({
  apiKey: "px_test_...",
  apiBaseUrl: "http://localhost:8000"
});

await client.identify({
  subject_id: "user_123",
  traits: { locale: "en" }
});

await client.track([
  {
    element_key: "checkout.continue",
    event_type: "hesitation",
    context: { page_type: "checkout" }
  }
]);

const decision = await client.resolve({
  subject_id: "user_123",
  element: {
    key: "checkout.continue",
    type: "button",
    intent: "progress",
    default_props: { text: "Continue" }
  },
  allow: { text: true, size: true, tooltip: true },
  constraints: { maxTextLength: 24, emoji: false },
  context: { page_type: "checkout", sensitive: false }
});
```

`resolve()` responses are cached in memory for 30 seconds by element key and subject. Calling `identify()` clears that cache because the profile may have changed.
