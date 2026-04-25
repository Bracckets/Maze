import { useMemo, useState } from "react";

import { PollexButton, PollexProvider, PollexText } from "@pollex/sdk-react";
import type { AdaptationDecision } from "@pollex/sdk-js";

import { DemoPollexClient } from "./demoClient";
import { personas } from "./personas";
import type { Persona } from "./personas";

type Screen = "onboarding" | "checkout" | "signup";

export function DemoPage() {
  const [persona, setPersona] = useState<Persona>(personas[0]);
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [overlayOpen, setOverlayOpen] = useState(true);
  const [decisions, setDecisions] = useState<Record<string, AdaptationDecision>>({});
  const client = useMemo(
    () =>
      new DemoPollexClient(
        () => persona,
        (decision) => setDecisions((current) => ({ ...current, [decision.element_key]: decision }))
      ),
    [persona]
  );

  function switchPersona(next: Persona) {
    setPersona(next);
    setDecisions({});
  }

  return (
    <PollexProvider apiKey="px_demo_local" apiBaseUrl="http://127.0.0.1:8000" client={client as never} userId={persona.userId} traits={persona.traits}>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="" className="h-5 w-auto object-contain" />
              <h1 className="text-3xl font-bold leading-9 text-gray-950">Adaptive demo</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">{persona.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {personas.map((item) => (
              <button
                key={item.id}
                onClick={() => switchPersona(item)}
                className={`pollex-pill rounded-full px-3 py-2 text-sm font-medium transition ${persona.id === item.id ? "pollex-pill-active" : ""}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <section className="space-y-5">
            <nav className="flex flex-wrap gap-2">
              {[
                ["onboarding", "Onboarding"],
                ["checkout", "Checkout"],
                ["signup", "Sign-up Form"]
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setScreen(id as Screen);
                    setDecisions({});
                  }}
                  className={`pollex-pill rounded-full px-3 py-2 text-sm font-medium ${screen === id ? "pollex-pill-active" : ""}`}
                >
                  {label}
                </button>
              ))}
            </nav>
            <DemoSurface screen={screen} />
          </section>
          <aside className="xl:sticky xl:top-20 xl:self-start">
            <button onClick={() => setOverlayOpen((open) => !open)} className="mb-3 w-full rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
              {overlayOpen ? "Hide Pollex" : "Show Pollex"}
            </button>
            {overlayOpen ? <AdaptationOverlay decisions={decisions} /> : null}
          </aside>
        </div>
      </div>
    </PollexProvider>
  );
}

function DemoSurface({ screen }: { screen: Screen }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-[#171719] p-8">
      {screen === "onboarding" ? <Onboarding /> : null}
      {screen === "checkout" ? <Checkout /> : null}
      {screen === "signup" ? <Signup /> : null}
    </div>
  );
}

function Onboarding() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
      <div>
        <PollexText id="onboarding.headline" intent="progress" allow={{ text: true }} className="block text-4xl font-semibold leading-tight text-gray-950">
          Checkout that adapts to every customer
        </PollexText>
        <p className="mt-4 max-w-xl text-base leading-7 text-gray-600">Pollex watches lightweight signals and safely adapts copy, target size, and guidance inside your design system.</p>
        <div className="mt-6">
          <PollexButton
            id="onboarding.get-started"
            intent="progress"
            allow={{ text: true, size: true, tooltip: false }}
            constraints={{ maxTextLength: 24, emoji: false }}
            className="rounded-full bg-indigo-600 px-5 py-2 font-medium text-white"
          >
            Get started
          </PollexButton>
        </div>
      </div>
      <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
        <img src="/pollex-shapes/x_line.png" alt="" className="mb-6 h-8 w-8 object-contain opacity-70" />
        <div className="text-sm font-medium text-gray-900">Default UI is always safe</div>
        <div className="mt-4 space-y-3">
          <div className="h-3 w-3/4 rounded bg-gray-200" />
          <div className="h-3 w-1/2 rounded bg-gray-200" />
          <div className="h-10 w-36 rounded-md bg-indigo-100" />
        </div>
      </div>
    </div>
  );
}

function Checkout() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-sm font-medium text-indigo-600">Checkout</div>
      <h1 className="mt-2 text-3xl font-semibold text-gray-950">Review payment</h1>
      <PollexText
        id="checkout.payment.explanation"
        intent="explanation"
        allow={{ text: true }}
        constraints={{ maxTextLength: 120 }}
        context={{ page_type: "checkout", sensitive: false }}
        className="mt-4 block leading-7 text-gray-600"
      >
        Your card is encrypted and you can review your order before we charge you.
      </PollexText>
      <div className="mt-6 rounded-2xl border border-gray-200 bg-[#1F1F24] p-4">
        <div className="flex justify-between text-sm"><span>Plan</span><span>Growth monthly</span></div>
        <div className="mt-2 flex justify-between text-sm"><span>Total due today</span><span className="font-semibold">$24</span></div>
      </div>
      <div className="mt-6">
        <PollexButton
          id="checkout.continue"
          intent="progress"
          allow={{ text: true, size: true, tooltip: true }}
          constraints={{ maxTextLength: 24, emoji: false }}
          context={{ page_type: "checkout", sensitive: false }}
          className="rounded-full bg-indigo-600 px-5 py-2 font-medium text-white"
        >
          Continue
        </PollexButton>
      </div>
    </div>
  );
}

function Signup() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-3xl font-semibold text-gray-950">Create your account</h1>
      <label className="mt-6 block">
        <PollexText id="signup.email.label" intent="submit" allow={{ text: true }} className="text-sm font-medium text-gray-700">
          Email address
        </PollexText>
        <input className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="you@example.com" />
      </label>
      <div className="mt-5">
        <PollexButton
          id="signup.submit"
          intent="submit"
          allow={{ text: true, size: true, helper_text: true }}
          constraints={{ maxTextLength: 24 }}
          className="rounded-full bg-gray-950 px-5 py-2 font-medium text-white"
        >
          Submit
        </PollexButton>
      </div>
    </div>
  );
}

function AdaptationOverlay({ decisions }: { decisions: Record<string, AdaptationDecision> }) {
  const rows = Object.values(decisions);
  return (
    <div className="rounded-3xl border border-gray-200 bg-[#171719]">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="text-sm font-semibold text-gray-950">Pollex proof panel</div>
        <div className="text-xs text-gray-500">element_key | adaptation | reason | mode | fallback</div>
      </div>
      <div className="max-h-[620px] divide-y divide-gray-100 overflow-auto">
        {rows.length === 0 ? <div className="p-4 text-sm text-gray-500">Waiting for wrapped elements to resolve.</div> : null}
        {rows.map((decision) => (
          <div key={decision.element_key} className={`p-4 text-sm ${decision.fallback ? "text-gray-500" : "text-gray-900"}`}>
            <div className="font-mono text-xs text-indigo-700">{decision.element_key}</div>
            <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-2 font-mono text-xs">{JSON.stringify(decision.adaptations)}</div>
            <div className="mt-2">{decision.reason}</div>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="rounded-full border border-gray-200 bg-green-100 px-2 py-1 text-green-800">{decision.mode}</span>
              <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-1 text-gray-700">fallback={String(decision.fallback)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
