"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  MouseEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useI18n } from "@/components/locale-provider";

const particles = [
  { left: "12%", top: "18%", delay: 0.2, duration: 4.8 },
  { left: "24%", top: "30%", delay: 1.1, duration: 5.1 },
  { left: "68%", top: "16%", delay: 0.8, duration: 4.5 },
  { left: "76%", top: "28%", delay: 1.6, duration: 5.4 },
  { left: "18%", top: "62%", delay: 1.4, duration: 5.8 },
  { left: "34%", top: "74%", delay: 0.5, duration: 4.9 },
  { left: "56%", top: "66%", delay: 1.9, duration: 5.2 },
  { left: "82%", top: "72%", delay: 1.2, duration: 5.6 },
] as const;

function SignalMetricRow({
  label,
  value,
  note,
  tone,
  active,
}: {
  label: string;
  value: string;
  note: string;
  tone: "accent" | "amber" | "red";
  active: boolean;
}) {
  return (
    <motion.div
      className="signal-metric-row"
      data-tone={tone}
      data-active={active ? "true" : "false"}
      layout
    >
      <span className="signal-metric-label">{label}</span>
      <motion.strong
        className="signal-metric-value"
        key={value}
        initial={{ opacity: 0.45, scale: 1.18 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        {value}
      </motion.strong>
      <em className="signal-metric-note">{note}</em>
    </motion.div>
  );
}

export function LandingHeroVisual() {
  const { locale } = useI18n();
  const prefersReducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const smoothX = useSpring(pointerX, { stiffness: 120, damping: 22, mass: 0.4 });
  const smoothY = useSpring(pointerY, { stiffness: 120, damping: 22, mass: 0.4 });

  const phoneX = useTransform(smoothX, (value) => value * 12);
  const phoneY = useTransform(smoothY, (value) => value * 10);
  const orbitX = useTransform(smoothX, (value) => value * 18);
  const orbitY = useTransform(smoothY, (value) => value * 14);
  const orbitBX = useTransform(smoothX, (value) => value * -12);
  const orbitBY = useTransform(smoothY, (value) => value * -10);
  const ambientBX = useTransform(smoothX, (value) => value * -8);
  const ambientBY = useTransform(smoothY, (value) => value * -6);
  const calloutLeftX = useTransform(smoothX, (value) => value * -10);
  const calloutLeftY = useTransform(smoothY, (value) => value * -8);
  const calloutRightX = useTransform(smoothX, (value) => value * 10);
  const calloutRightY = useTransform(smoothY, (value) => value * -4);
  const calloutBottomX = useTransform(smoothX, (value) => value * 6);
  const calloutBottomY = useTransform(smoothY, (value) => value * 8);

  const [rageTaps, setRageTaps] = useState(0);
  const [deadTaps, setDeadTaps] = useState(0);
  const [hesitation, setHesitation] = useState(0);
  const [rageActive, setRageActive] = useState(false);
  const [deadActive, setDeadActive] = useState(false);
  const [hesitationActive, setHesitationActive] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const lastButtonClickRef = useRef(0);
  const hesitationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTransient = useCallback((ref: { current: ReturnType<typeof setTimeout> | null }) => {
    if (ref.current) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  }, []);

  const flashRage = useCallback(() => {
    setRageActive(true);
    clearTransient(rageTimeoutRef);
    rageTimeoutRef.current = setTimeout(() => setRageActive(false), 900);
  }, [clearTransient]);

  const flashDead = useCallback(() => {
    setDeadActive(true);
    clearTransient(deadTimeoutRef);
    deadTimeoutRef.current = setTimeout(() => setDeadActive(false), 900);
  }, [clearTransient]);

  const stopHesitation = useCallback(() => {
    setHesitationActive(false);
    if (hesitationIntervalRef.current) {
      clearInterval(hesitationIntervalRef.current);
      hesitationIntervalRef.current = null;
    }
  }, []);

  const startHesitation = useCallback(() => {
    stopHesitation();
    setHesitationActive(true);
    hesitationIntervalRef.current = setInterval(() => {
      setHesitation((current) => Number((current + 0.1).toFixed(1)));
    }, 100);
  }, [stopHesitation]);

  const handleButtonClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const now = Date.now();
    if (now - lastButtonClickRef.current < 650) {
      setRageTaps((current) => current + 1);
      flashRage();
    }
    lastButtonClickRef.current = now;
  }, [flashRage]);

  const handleDeadTap = useCallback(() => {
    setDeadTaps((current) => current + 1);
    flashDead();
  }, [flashDead]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      stopHesitation();
      clearTransient(rageTimeoutRef);
      clearTransient(deadTimeoutRef);
    };
  }, [clearTransient, stopHesitation]);

  const stageTransition = useMemo(
    () => ({ duration: 0.9, ease: [0.16, 1, 0.3, 1] as const }),
    [],
  );

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    pointerX.set(x);
    pointerY.set(y);
  }

  function handlePointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <div className="signal-visual">
      <motion.div
        className="signal-stage"
        initial={false}
        animate={hasMounted ? { opacity: 1, y: 0 } : undefined}
        transition={stageTransition}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
      >
        <div className="signal-backdrop" />
        <div className="signal-grid" />

        <motion.div
          className="signal-ambient signal-ambient-a"
          style={prefersReducedMotion ? undefined : { x: orbitX, y: orbitY }}
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.04, 1], opacity: [0.42, 0.56, 0.42] }}
          transition={prefersReducedMotion ? undefined : { duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="signal-ambient signal-ambient-b"
          style={prefersReducedMotion ? undefined : { x: ambientBX, y: ambientBY }}
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.06, 1], opacity: [0.18, 0.3, 0.18] }}
          transition={prefersReducedMotion ? undefined : { duration: 15, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        />
        <motion.div
          className="signal-ambient signal-ambient-c"
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.03, 1], opacity: [0.14, 0.22, 0.14] }}
          transition={prefersReducedMotion ? undefined : { duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        />

        <motion.div
          className="signal-orbit signal-orbit-a"
          style={prefersReducedMotion ? undefined : { x: orbitX, y: orbitY }}
          animate={prefersReducedMotion ? undefined : { rotate: 360 }}
          transition={prefersReducedMotion ? undefined : { duration: 22, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="signal-orbit signal-orbit-b"
          style={prefersReducedMotion ? undefined : { x: orbitBX, y: orbitBY }}
          animate={prefersReducedMotion ? undefined : { rotate: -360 }}
          transition={prefersReducedMotion ? undefined : { duration: 34, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="signal-ring signal-ring-a"
          animate={prefersReducedMotion ? undefined : { scale: [0.96, 1.04, 0.96], opacity: [0.18, 0.3, 0.18] }}
          transition={prefersReducedMotion ? undefined : { duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="signal-ring signal-ring-b"
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.05, 1], opacity: [0.08, 0.16, 0.08] }}
          transition={prefersReducedMotion ? undefined : { duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
        />

        <div className="signal-particles">
          {particles.map((particle, index) => (
            <motion.span
              key={`${particle.left}-${particle.top}`}
              className="signal-particle"
              style={{ left: particle.left, top: particle.top }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={
                prefersReducedMotion
                  ? { opacity: 0.25, scale: 1 }
                  : { opacity: [0.12, 0.48, 0.12], scale: [0.8, 1.3, 0.8] }
              }
              transition={
                prefersReducedMotion
                  ? { duration: 0.6, delay: index * 0.05 }
                  : {
                      duration: particle.duration,
                      delay: particle.delay,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
              }
            />
          ))}
        </div>

        <div className="signal-phone-anchor">
          <motion.div
            className="signal-phone"
            style={prefersReducedMotion ? undefined : { x: phoneX, y: phoneY }}
            initial={false}
            animate={
              !hasMounted
                ? { opacity: 1, rotate: -7, scale: 1 }
                : prefersReducedMotion
                ? { opacity: 1, rotate: -7, scale: 1 }
                : { opacity: 1, rotate: [-7, -5.5, -7], scale: 1 }
            }
            transition={
              !hasMounted || prefersReducedMotion
                ? { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
                : {
                    opacity: { duration: 0.8 },
                    scale: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
                    rotate: { duration: 8, repeat: Infinity, ease: "easeInOut" },
                  }
            }
          >
            <div className="signal-phone-shell">
              <div className="signal-phone-top" />
              <div className="signal-status-rail" />
              <div
                className="signal-screen signal-screen-interactive"
                onClick={handleDeadTap}
                role="presentation"
              >
              <div className="signal-screen-glow" />
              <div className="signal-screen-noise" />
              <motion.div
                className="signal-hotspot hotspot-a"
                animate={
                  prefersReducedMotion
                    ? undefined
                    : {
                        scale: rageActive ? [1, 1.2, 1] : [0.92, 1.08, 0.92],
                        opacity: rageActive ? [0.6, 1, 0.6] : [0.55, 0.92, 0.55],
                      }
                }
                transition={prefersReducedMotion ? undefined : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="signal-hotspot hotspot-b"
                animate={
                  prefersReducedMotion
                    ? undefined
                    : {
                        scale: deadActive ? [1, 1.18, 1] : [0.9, 1.05, 0.9],
                        opacity: deadActive ? [0.48, 0.92, 0.48] : [0.4, 0.78, 0.4],
                      }
                }
                transition={prefersReducedMotion ? undefined : { duration: 4.1, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />
              <motion.div
                className="signal-hotspot hotspot-c"
                animate={
                  prefersReducedMotion
                    ? undefined
                    : {
                        scale: hesitationActive ? [1, 1.22, 1] : [0.94, 1.1, 0.94],
                        opacity: hesitationActive ? [0.52, 0.96, 0.52] : [0.44, 0.82, 0.44],
                      }
                }
                transition={prefersReducedMotion ? undefined : { duration: 4.4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              />
              <div className="signal-flow flow-a" />
              <div className="signal-flow flow-b" />
              <div className="signal-flow flow-c" />
              <div className="signal-ui signal-ui-nav" />
              <div className="signal-ui signal-ui-title" />
              <div className="signal-ui signal-ui-card" />
              <div className="signal-ui signal-ui-field signal-ui-field-a" />
              <div className="signal-ui signal-ui-field signal-ui-field-b" />
              <div className="signal-ui signal-ui-field signal-ui-field-c" />
              <div className="signal-ui-caption">{locale === "ar" ? "خريطة إشارات التهيئة" : "Onboarding signal map"}</div>
              <motion.button
                type="button"
                className="signal-ui signal-ui-button signal-cta-button"
                data-rage={rageActive ? "true" : "false"}
                data-hesitation={hesitationActive ? "true" : "false"}
                onClick={handleButtonClick}
                onMouseDown={startHesitation}
                onMouseUp={stopHesitation}
                onMouseLeave={stopHesitation}
                onTouchStart={startHesitation}
                onTouchEnd={stopHesitation}
                onTouchCancel={stopHesitation}
                whileTap={{ scale: 0.985 }}
              >
                {locale === "ar" ? "سجّل الدخول إلى Maze" : "Sign in to Maze"}
              </motion.button>
                <div className="signal-screen-hint">
                  {locale === "ar"
                    ? "النقر السريع المتكرر يفعّل رصد نقرات الغضب. انقر خارج الزر لتسجيل النقرات الميتة."
                    : "Rapid taps trigger rage tap detection. Tap elsewhere for dead taps."}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="signal-callout signal-callout-left"
          data-tone="accent"
          style={prefersReducedMotion ? undefined : { x: calloutLeftX, y: calloutLeftY }}
          initial={false}
          animate={hasMounted ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="signal-callout-connector">
            <span className="signal-callout-dot" />
            <span className="signal-callout-line" />
          </div>
          <div className="signal-callout-copy">
            <span>{locale === "ar" ? "عنقود نقرات الغضب" : "Rage tap cluster"}</span>
            <strong>{locale === "ar" ? "نموذج الهوية" : "Identity form"}</strong>
            <em className="signal-value">
              {rageTaps > 0
                ? locale === "ar"
                  ? `${rageTaps} دفعة سريعة`
                  : `${rageTaps} rapid burst${rageTaps === 1 ? "" : "s"}`
                : locale === "ar"
                  ? "انقر الزر بسرعة"
                  : "tap the button quickly"}
            </em>
          </div>
        </motion.div>

        <motion.div
          className="signal-callout signal-callout-right"
          data-tone="amber"
          style={prefersReducedMotion ? undefined : { x: calloutRightX, y: calloutRightY }}
          initial={false}
          animate={hasMounted ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.7, delay: 0.52, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="signal-callout-connector">
            <span className="signal-callout-dot" />
            <span className="signal-callout-line" />
          </div>
          <div className="signal-callout-copy">
            <span>{locale === "ar" ? "حقل النقرات الميتة" : "Dead tap field"}</span>
            <strong>{locale === "ar" ? "إدخال خارج الهدف" : "Off-target input"}</strong>
            <em className="signal-value">
              {deadTaps > 0
                ? locale === "ar"
                  ? `${deadTaps} نقرة فائتة`
                  : `${deadTaps} missed tap${deadTaps === 1 ? "" : "s"}`
                : locale === "ar"
                  ? "انقر خارج الزر"
                  : "tap outside the button"}
            </em>
          </div>
        </motion.div>

        <motion.div
          className="signal-callout signal-callout-bottom"
          data-tone="red"
          style={prefersReducedMotion ? undefined : { x: calloutBottomX, y: calloutBottomY }}
          initial={false}
          animate={hasMounted ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.7, delay: 0.64, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="signal-callout-connector">
            <span className="signal-callout-dot" />
            <span className="signal-callout-line" />
          </div>
          <div className="signal-callout-copy">
            <span>{locale === "ar" ? "فجوة التردد" : "Hesitation gap"}</span>
            <strong>{locale === "ar" ? "تأكيد التحميل" : "Loading confirmation"}</strong>
            <em className="signal-value">
              {hesitation > 0
                ? locale === "ar"
                  ? `${hesitation.toFixed(1)}ث ثبات`
                  : `${hesitation.toFixed(1)}s held`
                : locale === "ar"
                  ? "اضغط مطولاً على الزر"
                  : "press and hold the button"}
            </em>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="signal-metrics"
        initial={false}
        animate={hasMounted ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.7, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        <SignalMetricRow
          label={locale === "ar" ? "نقرات الغضب" : "Rage taps"}
          value={String(rageTaps)}
          note={locale === "ar" ? "نقرات متكررة سريعة على الزر" : "rapid repeat clicks on the button"}
          tone="accent"
          active={rageActive}
        />
        <SignalMetricRow
          label={locale === "ar" ? "النقرات الميتة" : "Dead taps"}
          value={String(deadTaps)}
          note={locale === "ar" ? "نقرات خارج الهدف على شاشة الهاتف" : "off-target taps on the phone screen"}
          tone="amber"
          active={deadActive}
        />
        <SignalMetricRow
          label={locale === "ar" ? "تردد الاستجابة" : "Latency hesitation"}
          value={locale === "ar" ? `${hesitation.toFixed(1)}ث` : `${hesitation.toFixed(1)}s`}
          note={locale === "ar" ? "مدة الضغط قبل التنفيذ" : "hold time before committing"}
          tone="red"
          active={hesitationActive}
        />
      </motion.div>
    </div>
  );
}
