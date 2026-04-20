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
  { src: "/pollex-shapes/square.png", alt: "", width: 68, height: 68, left: "6%", top: "18%", rotate: "-18deg", delay: "0.4s" },
  { src: "/pollex-shapes/e_line.png", alt: "", width: 96, height: 58, left: "79%", top: "16%", rotate: "38deg", delay: "1s" },
  { src: "/pollex-shapes/x_line.png", alt: "", width: 74, height: 74, left: "10%", top: "72%", rotate: "16deg", delay: "1.6s" },
  { src: "/pollex-shapes/triangle.png", alt: "", width: 88, height: 88, left: "87%", top: "64%", rotate: "-18deg", delay: "0.7s" },
];

const processSteps = [
  {
    shape: "/pollex-shapes/l_line.png",
    shapeHeight: 96,
    shapeWidth: 22,
    title: "Track",
    body: "Capture clicks, taps, hesitation, and interaction patterns without changing your product flow.",
  },
  {
    shape: "/pollex-shapes/e_line.png",
    shapeHeight: 52,
    shapeWidth: 86,
    title: "Understand",
    body: "Detect friction, intent, and repeated paths so your team sees what users are actually trying to do.",
  },
  {
    shape: "/pollex-shapes/x_line.png",
    shapeHeight: 62,
    shapeWidth: 62,
    title: "Adapt",
    body: "Personalize interface and content variants with Liquid instead of shipping one UI for everyone.",
  },
] as const;

const experienceBullets = ["Heatmaps", "Rage/dead clicks", "Session insights", "Behavior signals"] as const;

const liquidBullets = [
  "Dynamic UI/content variants",
  "Behavior-based personalization",
  "No manual A/B testing",
] as const;

const actionCards = [
  {
    title: "Insights",
    body: "Detect friction like rage taps, dead clicks, hesitation, and drop-off moments before they become churn.",
    lines: ["Rage taps", "Dead clicks", "Hesitation", "Drop-off paths"],
  },
  {
    title: "Action",
    body: "Use Liquid to adapt layouts, content, and CTA hierarchy based on what the user is signaling in real time.",
    lines: ["Interface variants", "Copy shifts", "Layout priority", "Targeted recovery"],
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
    <div className={`pollex-home-shape ${shape.className ?? ""}`.trim()} style={style} aria-hidden="true">
      <Image alt={shape.alt} src={shape.src} width={shape.width} height={shape.height} />
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
        <span>Session 04</span>
        <span>Drop-off detected</span>
      </div>

      <div className="pollex-product-mock-shell">
        <div className="pollex-product-mock-sidebar">
          <div>
            <span className="pollex-product-mock-label">Signals</span>
            <strong>Heatmap</strong>
          </div>
          <div className="pollex-product-mock-stack">
            <div className="pollex-product-chip active">Tap density</div>
            <div className="pollex-product-chip">Rage clicks</div>
            <div className="pollex-product-chip">Intent path</div>
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
            <span className="pollex-product-mock-label">Rage clicks</span>
            <strong>12 bursts</strong>
            <p>Primary CTA ignored after second field.</p>
          </div>
          <div className="pollex-product-note">
            <span className="pollex-product-mock-label">Intent</span>
            <strong>Retrying checkout</strong>
            <p>Users pause on discount input before exiting.</p>
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
          <Image alt="" src="/pollex-shapes/l_line.png" width={18} height={72} aria-hidden="true" />
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
        <Image alt="" src="/pollex-shapes/triangle.png" width={58} height={58} />
      </div>

      <article className="pollex-liquid-card active">
        <div className="pollex-liquid-card-head">
          <span>After</span>
          <Image alt="" src="/pollex-shapes/e_line.png" width={72} height={42} aria-hidden="true" />
        </div>
        <div className="pollex-liquid-ui">
          <div className="pollex-liquid-variant-pill">Liquid variant</div>
          <div className="pollex-liquid-ui-copy">
            <strong>Intent-aware recovery</strong>
            <p>CTA priority, copy, and field order adapt to hesitation and repeat behavior.</p>
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
            <p className="pollex-home-eyebrow">Behavior intelligence, built for adaptive interfaces</p>
            <h1>Automatically detect UX issues and adapt your UI for every user.</h1>
            <p className="pollex-home-subtext">
              Track behavior, understand intent, and personalize experiences without rewriting your app.
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
            <p className="pollex-home-hero-note">Pollex connects product signal, friction analysis, and Liquid-driven adaptation.</p>
            <div className="pollex-home-logo-pill">
              <Image alt="Pollex logo" src="/logo.png" width={430} height={82} priority />
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
        <SectionHeading
          eyebrow="How it works"
          title="Capture behavior, interpret intent, and turn signal into interface changes."
          body="A simple three-step system keeps the product story clear while preserving the same premium visual language."
        />

        <div className="pollex-process-grid">
          {processSteps.map((step, index) => (
            <article className="pollex-process-card" key={step.title}>
              <div className="pollex-process-topline">
                <span className="pollex-process-index">0{index + 1}</span>
                <Image alt="" src={step.shape} width={step.shapeWidth} height={step.shapeHeight} aria-hidden="true" />
              </div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pollex-home pollex-home-section">
        <div className="pollex-home-split">
          <div className="pollex-home-copy-column">
            <SectionHeading
              eyebrow="Product in action"
              title="See what your users actually experience"
              body="Follow live friction patterns across sessions and screens instead of inferring them from static analytics."
            />

            <ul className="pollex-home-bullet-list">
              {experienceBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <ProductMock />
        </div>
      </section>

      <section className="pollex-home pollex-home-section pollex-home-section-highlight">
        <div className="pollex-home-split pollex-home-split-reverse">
          <div className="pollex-home-copy-column">
            <SectionHeading
              eyebrow="Liquid engine"
              title="Liquid adapts the interface to the user"
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
          title="Detect the problem, then respond inside the product."
          body="The loop is short: surface friction patterns, decide what matters, and trigger the right interface response."
        />

        <div className="pollex-action-grid">
          {actionCards.map((card, index) => (
            <article className="pollex-action-card" key={card.title}>
              <div className="pollex-action-card-topline">
                <h3>{card.title}</h3>
                <Image
                  alt=""
                  src={index === 0 ? "/pollex-shapes/x_line.png" : "/pollex-shapes/triangle.png"}
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
              body="Drop in the SDK, start collecting behavior events, and unlock Pollex across product surfaces."
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
        <div className="pollex-home-hero-field pollex-home-cta-field" aria-hidden="true">
          {ctaShapes.map((shape) => (
            <FloatingShape key={`${shape.src}-${shape.left}-${shape.top}`} shape={shape} />
          ))}
        </div>

        <div className="pollex-home-final-copy">
          <p className="pollex-home-eyebrow">Start now</p>
          <h2>Start adapting your UI today</h2>
          <p>Move from observation to action with a landing page story that matches the product itself: precise, adaptive, and premium.</p>
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
