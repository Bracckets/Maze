import type { CSSProperties } from "react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { PollexHeroCanvas } from "@/components/pollex-hero-canvas";

type FloatingShapeConfig = {
  alt: string;
  className?: string;
  delay?: string;
  height: number;
  left: string;
  rotate: string;
  src: string;
  top: string;
  width: number;
};

const ctaShapes: FloatingShapeConfig[] = [
  {
    src: "/pollex-shapes/square.png",
    alt: "",
    width: 68,
    height: 68,
    left: "6%",
    top: "18%",
    rotate: "-18deg",
    delay: "0.4s",
  },
  {
    src: "/pollex-shapes/e_line.png",
    alt: "",
    width: 96,
    height: 58,
    left: "79%",
    top: "16%",
    rotate: "38deg",
    delay: "1s",
  },
  {
    src: "/pollex-shapes/x_line.png",
    alt: "",
    width: 74,
    height: 74,
    left: "10%",
    top: "72%",
    rotate: "16deg",
    delay: "1.6s",
  },
  {
    src: "/pollex-shapes/triangle.png",
    alt: "",
    width: 88,
    height: 88,
    left: "87%",
    top: "64%",
    rotate: "-18deg",
    delay: "0.7s",
  },
];

const processSteps = [
  {
    shape: "/pollex-shapes/l_line.png",
    shapeHeight: 96,
    shapeWidth: 22,
    title: "Track",
    label: "Behavior signals",
    body: "Capture clicks, taps, hesitation, rage bursts, and path changes without interrupting the product.",
  },
  {
    shape: "/pollex-shapes/e_line.png",
    shapeHeight: 52,
    shapeWidth: 86,
    title: "Understand",
    label: "Intent model",
    body: "Turn scattered events into a clear read on what the user tried, where they paused, and why it matters.",
  },
  {
    shape: "/pollex-shapes/x_line.png",
    shapeHeight: 62,
    shapeWidth: 62,
    title: "Adapt",
    label: "Liquid response",
    body: "Ship better hierarchy, copy, and recovery states while the session is still alive.",
  },
] as const;

const signalRows = [
  {
    label: "Friction",
    value: "Rage taps",
    detail: "12 bursts around the disabled CTA",
  },
  {
    label: "Intent",
    value: "Retrying checkout",
    detail: "Repeated return to discount field",
  },
  {
    label: "Recovery",
    value: "Variant ready",
    detail: "Reduce fields and raise support copy",
  },
] as const;

const liquidBullets = [
  "Dynamic UI/content variants",
  "Behavior-based personalization",
  "No manual A/B testing",
] as const;

const actionCards = [
  {
    title: "Signal",
    body: "Pollex watches the moments that static analytics flatten: hesitation, repeated taps, reversal paths, and recovery intent.",
    lines: ["Rage taps", "Dead clicks", "Hesitation", "Drop-off paths"],
  },
  {
    title: "Response",
    body: "Liquid uses those signals to change the product surface itself, from copy priority to field order and CTA recovery.",
    lines: [
      "Interface variants",
      "Copy shifts",
      "Layout priority",
      "Targeted recovery",
    ],
  },
] as const;

const comparisonRows = [
  { traditional: "Static dashboards", pollex: "Adaptive UI" },
  { traditional: "Manual experiments", pollex: "Auto-personalization" },
  { traditional: "Insight only", pollex: "Insight + action" },
] as const;

const platforms = ["Web", "iOS", "Android"] as const;

function FloatingShape({ shape }: { shape: FloatingShapeConfig }) {
  const style = {
    "--shape-left": shape.left,
    "--shape-top": shape.top,
    "--shape-rotate": shape.rotate,
    "--shape-delay": shape.delay ?? "0s",
  } as CSSProperties;

  return (
    <div
      className={`pollex-home-shape ${shape.className ?? ""}`.trim()}
      style={style}
      aria-hidden="true"
    >
      <Image
        alt={shape.alt}
        src={shape.src}
        width={shape.width}
        height={shape.height}
      />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  body: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="pollex-home-heading">
      <p className="pollex-home-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function ProductMock() {
  return (
    <div className="pollex-product-mock">
      <div className="pollex-product-mock-topbar">
        <span>Behavior workbench</span>
        <span>Live signal</span>
      </div>

      <div className="pollex-product-mock-shell">
        <div className="pollex-product-mock-sidebar">
          <div>
            <span className="pollex-product-mock-label">Surface</span>
            <strong>Checkout flow</strong>
          </div>
          <div className="pollex-product-mock-stack">
            <div className="pollex-product-chip active">Behavior signals</div>
            <div className="pollex-product-chip">Rage clicks</div>
            <div className="pollex-product-chip">Intent path</div>
            <div className="pollex-product-chip">Liquid response</div>
          </div>
        </div>

        <div className="pollex-product-mock-stage">
          <div className="pollex-product-phone">
            <div className="pollex-product-phone-header" />
            <div className="pollex-product-phone-block large" />
            <div className="pollex-product-phone-block" />
            <div className="pollex-product-phone-row">
              <div className="pollex-product-phone-block small" />
              <div className="pollex-product-phone-block small" />
            </div>
            <div className="pollex-product-phone-cta" />
            <span className="pollex-product-hotspot hotspot-a" />
            <span className="pollex-product-hotspot hotspot-b" />
            <span className="pollex-product-hotspot hotspot-c" />
            <span className="pollex-product-path path-a" />
            <span className="pollex-product-path path-b" />
          </div>
        </div>

        <div className="pollex-product-mock-insights">
          <div className="pollex-product-note">
            <span className="pollex-product-mock-label">Friction</span>
            <strong>12 bursts</strong>
            <p>Primary CTA ignored after the second field.</p>
          </div>
          <div className="pollex-product-note">
            <span className="pollex-product-mock-label">Intent</span>
            <strong>Retrying checkout</strong>
            <p>Users pause on discount input before exiting.</p>
          </div>
          <div className="pollex-product-note pollex-product-note-active">
            <span className="pollex-product-mock-label">Liquid</span>
            <strong>Recovery variant</strong>
            <p>Shorter form and clearer reassurance are ready.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiquidCompare() {
  return (
    <div className="pollex-liquid-compare">
      <article className="pollex-liquid-card">
        <div className="pollex-liquid-card-head">
          <span>Before</span>
          <Image
            alt=""
            src="/pollex-shapes/l_line.png"
            width={18}
            height={72}
            aria-hidden="true"
          />
        </div>
        <div className="pollex-liquid-ui dense">
          <div className="pollex-liquid-ui-copy">
            <strong>Generic onboarding</strong>
            <p>Same layout, same copy, same order for every visitor.</p>
          </div>
          <div className="pollex-liquid-ui-form">
            <span />
            <span />
            <span />
          </div>
          <div className="pollex-liquid-ui-button muted">Continue</div>
        </div>
      </article>

      <div className="pollex-liquid-arrow" aria-hidden="true">
        <Image
          alt=""
          src="/pollex-shapes/triangle.png"
          width={58}
          height={58}
        />
      </div>

      <article className="pollex-liquid-card active">
        <div className="pollex-liquid-card-head">
          <span>After</span>
          <Image
            alt=""
            src="/pollex-shapes/e_line.png"
            width={72}
            height={42}
            aria-hidden="true"
          />
        </div>
        <div className="pollex-liquid-ui">
          <div className="pollex-liquid-variant-pill">Liquid variant</div>
          <div className="pollex-liquid-ui-copy">
            <strong>Intent-aware recovery</strong>
            <p>
              CTA priority, copy, and field order adapt to hesitation and repeat
              behavior.
            </p>
          </div>
          <div className="pollex-liquid-ui-form refined">
            <span />
            <span />
          </div>
          <div className="pollex-liquid-ui-button">Resume checkout</div>
        </div>
      </article>
    </div>
  );
}

export function PollexLanding({
  bookDemoHref,
  demoHref,
  primaryHref,
}: {
  bookDemoHref: Route;
  demoHref: Route;
  primaryHref: Route;
}) {
  return (
    <div className="pollex-home-stack">
      <section className="pollex-home pollex-home-hero">
        <PollexHeroCanvas />

        <div className="pollex-home-hero-content">
          <div className="pollex-home-hero-copy">
            <p className="pollex-home-eyebrow">
              Behavior intelligence, built for adaptive interfaces
            </p>
            <h1>
              Automatically detect UX issues and adapt your UI for every user.
            </h1>
            <p className="pollex-home-subtext">
              Track behavior, understand intent, and personalize experiences
              without rewriting your app.
            </p>
            <div className="pollex-home-actions">
              <Link className="pollex-home-button primary" href={primaryHref}>
                Start Free
              </Link>
              <Link className="pollex-home-button secondary" href={demoHref}>
                See Demo
              </Link>
            </div>
          </div>

          <div className="pollex-home-hero-center">
            <p className="pollex-home-hero-note">
              Pollex connects product signal, friction analysis, and
              Liquid-driven adaptation.
            </p>
            <div className="pollex-home-logo-pill">
              <Image
                alt="Pollex logo"
                src="/logo.png"
                width={430}
                height={82}
                priority
              />
            </div>
            <div className="pollex-home-flow">
              <span>Track</span>
              <span>Understand</span>
              <span>Adapt</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pollex-home pollex-home-section">
        <div className="pollex-story-grid">
          <SectionHeading
            eyebrow="From observation to adaptation"
            title="Pollex closes the loop that analytics leave open."
            body="Most tools tell you what happened after the session is gone. Pollex reads the behavior signal, explains the user intent, and gives Liquid a response the interface can use."
          />

          <div className="pollex-process-grid">
            {processSteps.map((step, index) => (
              <article className="pollex-process-card" key={step.title}>
                <div className="pollex-process-topline">
                  <span className="pollex-process-index">0{index + 1}</span>
                  <Image
                    alt=""
                    src={step.shape}
                    width={step.shapeWidth}
                    height={step.shapeHeight}
                    aria-hidden="true"
                  />
                </div>
                <p className="pollex-process-label">{step.label}</p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pollex-home pollex-home-section pollex-home-section-product">
        <div className="pollex-home-split">
          <div className="pollex-home-copy-column">
            <SectionHeading
              eyebrow="Product in action"
              title="A workbench for the moment where users get stuck."
              body="Follow live friction patterns across screens, then connect them to the response your product should show next."
            />

            <div className="pollex-signal-list">
              {signalRows.map((row) => (
                <div className="pollex-signal-row" key={row.value}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                  <p>{row.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <ProductMock />
        </div>
      </section>

      <section className="pollex-home pollex-home-section pollex-home-section-highlight">
        <div className="pollex-home-split pollex-home-split-reverse">
          <div className="pollex-home-copy-column">
            <SectionHeading
              eyebrow="Liquid engine"
              title="Liquid turns behavior into a better interface."
              body="Pollex does not stop at reporting. Liquid uses behavior signals to present better content, clearer hierarchy, and more relevant UI states."
            />

            <ul className="pollex-home-bullet-list">
              {liquidBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <LiquidCompare />
        </div>
      </section>

      <section className="pollex-home pollex-home-section">
        <SectionHeading
          eyebrow="Insights + action"
          title="From insight to adaptation, without another experiment queue."
          body="The loop is short: surface friction patterns, decide what matters, and trigger the right interface response."
        />

        <div className="pollex-action-grid">
          {actionCards.map((card, index) => (
            <article className="pollex-action-card" key={card.title}>
              <div className="pollex-action-card-topline">
                <h3>{card.title}</h3>
                <Image
                  alt=""
                  src={
                    index === 0
                      ? "/pollex-shapes/x_line.png"
                      : "/pollex-shapes/triangle.png"
                  }
                  width={index === 0 ? 54 : 60}
                  height={index === 0 ? 54 : 60}
                  aria-hidden="true"
                />
              </div>
              <p>{card.body}</p>
              <div className="pollex-action-lines">
                {card.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pollex-home pollex-home-section">
        <div className="pollex-home-split pollex-home-split-tight">
          <div className="pollex-home-copy-column">
            <SectionHeading
              eyebrow="Integration"
              title="Integrates in minutes"
              body="Drop in the SDK, start collecting behavior events, and unlock Pollex across web, iOS, and Android surfaces."
            />

            <div className="pollex-platform-row">
              {platforms.map((platform) => (
                <span className="pollex-platform-pill" key={platform}>
                  {platform}
                </span>
              ))}
            </div>
          </div>

          <div className="pollex-code-card">
            <pre>
              <code>{`import { pollex } from "@pollex/sdk"
pollex.init({ apiKey: "your_key" })`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="pollex-home pollex-home-section">
        <SectionHeading
          eyebrow="Differentiation"
          title="Traditional analytics stop at insight. Pollex moves to adaptation."
          body="The contrast is straightforward: one approach reports what happened, the other changes the experience while the session is still recoverable."
        />

        <div className="pollex-compare-table">
          <div className="pollex-compare-head">
            <span>Traditional</span>
            <span>Pollex</span>
          </div>
          {comparisonRows.map((row) => (
            <div className="pollex-compare-row" key={row.traditional}>
              <div>{row.traditional}</div>
              <div>{row.pollex}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="pollex-home pollex-home-final-cta">
        <div
          className="pollex-home-hero-field pollex-home-cta-field"
          aria-hidden="true"
        >
          {ctaShapes.map((shape) => (
            <FloatingShape
              key={`${shape.src}-${shape.left}-${shape.top}`}
              shape={shape}
            />
          ))}
        </div>

        <div className="pollex-home-final-copy">
          <p className="pollex-home-eyebrow">Start now</p>
          <h2>
            Make the product respond while the moment is still recoverable.
          </h2>
          <p>
            Move from observation to action with a system that reads behavior,
            understands intent, and adapts the interface in time.
          </p>
          <div className="pollex-home-actions">
            <Link className="pollex-home-button primary" href={primaryHref}>
              Start Free
            </Link>
            <Link className="pollex-home-button secondary" href={bookDemoHref}>
              Book Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
