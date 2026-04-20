"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function PollexLandingCursor() {
  const pointerTarget = useRef({ x: 0, y: 0 });
  const pointerCurrent = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const visibleRef = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const supportsFinePointer = window.matchMedia("(pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!supportsFinePointer || prefersReducedMotion) {
      return;
    }

    setEnabled(true);
    document.body.classList.add("pollex-cursor-active");

    const animate = () => {
      pointerCurrent.current.x += (pointerTarget.current.x - pointerCurrent.current.x) * 0.24;
      pointerCurrent.current.y += (pointerTarget.current.y - pointerCurrent.current.y) * 0.24;
      setPosition({
        x: pointerCurrent.current.x,
        y: pointerCurrent.current.y,
      });
      frameRef.current = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerTarget.current = { x: event.clientX, y: event.clientY };
      if (!visibleRef.current) {
        pointerCurrent.current = { x: event.clientX, y: event.clientY };
        setPosition({ x: event.clientX, y: event.clientY });
      }
      visibleRef.current = true;
      setVisible(true);
      setInteractive(Boolean((event.target as HTMLElement | null)?.closest("a, button")));
    };

    const handlePointerLeave = () => {
      visibleRef.current = false;
      setVisible(false);
      setInteractive(false);
    };

    frameRef.current = window.requestAnimationFrame(animate);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerdown", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      document.body.classList.remove("pollex-cursor-active");
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={`pollex-landing-cursor ${visible ? "visible" : ""} ${interactive ? "interactive" : ""}`.trim()}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
    >
      <Image alt="" src="/pollex-shapes/x_line.png" width={54} height={54} priority />
    </div>
  );
}
