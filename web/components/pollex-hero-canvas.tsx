"use client";

import { useEffect, useRef } from "react";

import { useTheme } from "@/components/theme-provider";

type HeroShape = {
  baseRotation: number;
  depth: number;
  hideOnMobile?: boolean;
  rotationAmplitude: number;
  size: number;
  src: string;
  x: number;
  y: number;
};

const heroShapes: HeroShape[] = [
  { src: "/pollex-shapes/square.png", x: 0.05, y: 0.2, size: 0.09, baseRotation: -0.36, rotationAmplitude: 0.08, depth: 28 },
  { src: "/pollex-shapes/triangle.png", x: 0.13, y: 0.18, size: 0.1, baseRotation: -0.24, rotationAmplitude: 0.12, depth: 34 },
  { src: "/pollex-shapes/triangle.png", x: 0.04, y: 0.42, size: 0.082, baseRotation: 0.28, rotationAmplitude: 0.1, depth: 22, hideOnMobile: true },
  { src: "/pollex-shapes/l_line.png", x: 0.05, y: 0.65, size: 0.1, baseRotation: -0.5, rotationAmplitude: 0.06, depth: 18, hideOnMobile: true },
  { src: "/pollex-shapes/square.png", x: 0.06, y: 0.87, size: 0.085, baseRotation: 0.48, rotationAmplitude: 0.08, depth: 26, hideOnMobile: true },
  { src: "/pollex-shapes/triangle.png", x: 0.18, y: 0.9, size: 0.08, baseRotation: -0.66, rotationAmplitude: 0.08, depth: 32, hideOnMobile: true },
  { src: "/pollex-shapes/square.png", x: 0.31, y: 0.89, size: 0.084, baseRotation: -0.22, rotationAmplitude: 0.06, depth: 20, hideOnMobile: true },
  { src: "/pollex-shapes/l_line.png", x: 0.44, y: 0.91, size: 0.106, baseRotation: 0.52, rotationAmplitude: 0.06, depth: 24, hideOnMobile: true },
  { src: "/pollex-shapes/e_line.png", x: 0.54, y: 0.92, size: 0.106, baseRotation: -0.54, rotationAmplitude: 0.08, depth: 30, hideOnMobile: true },
  { src: "/pollex-shapes/l_line.png", x: 0.67, y: 0.88, size: 0.104, baseRotation: 0.48, rotationAmplitude: 0.06, depth: 18, hideOnMobile: true },
  { src: "/pollex-shapes/x_line.png", x: 0.79, y: 0.89, size: 0.08, baseRotation: 0.14, rotationAmplitude: 0.08, depth: 26, hideOnMobile: true },
  { src: "/pollex-shapes/e_line.png", x: 0.92, y: 0.89, size: 0.1, baseRotation: -0.52, rotationAmplitude: 0.08, depth: 32, hideOnMobile: true },
  { src: "/pollex-shapes/e_line.png", x: 0.82, y: 0.16, size: 0.102, baseRotation: 0.82, rotationAmplitude: 0.08, depth: 36 },
  { src: "/pollex-shapes/triangle.png", x: 0.94, y: 0.28, size: 0.086, baseRotation: -0.52, rotationAmplitude: 0.1, depth: 34 },
  { src: "/pollex-shapes/x_line.png", x: 0.92, y: 0.44, size: 0.08, baseRotation: 0.24, rotationAmplitude: 0.1, depth: 28 },
  { src: "/pollex-shapes/triangle.png", x: 0.94, y: 0.58, size: 0.084, baseRotation: -0.16, rotationAmplitude: 0.12, depth: 20, hideOnMobile: true },
  { src: "/pollex-shapes/x_line.png", x: 0.92, y: 0.72, size: 0.076, baseRotation: 0.02, rotationAmplitude: 0.06, depth: 16, hideOnMobile: true },
  { src: "/pollex-shapes/triangle.png", x: 0.9, y: 0.82, size: 0.078, baseRotation: 0.04, rotationAmplitude: 0.1, depth: 22, hideOnMobile: true },
];

const mobileHeroShapes: HeroShape[] = [
  { src: "/pollex-shapes/square.png", x: -0.02, y: 0.42, size: 0.11, baseRotation: -0.34, rotationAmplitude: 0.04, depth: 8 },
  { src: "/pollex-shapes/triangle.png", x: 1.02, y: 0.48, size: 0.1, baseRotation: -0.18, rotationAmplitude: 0.06, depth: 10 },
  { src: "/pollex-shapes/x_line.png", x: 0.92, y: 0.62, size: 0.062, baseRotation: 0.12, rotationAmplitude: 0.05, depth: 8 },
  { src: "/pollex-shapes/e_line.png", x: 0.8, y: 0.88, size: 0.1, baseRotation: -0.48, rotationAmplitude: 0.06, depth: 8 },
  { src: "/pollex-shapes/triangle.png", x: 0.12, y: 0.94, size: 0.08, baseRotation: -0.42, rotationAmplitude: 0.06, depth: 8 },
];

export function PollexHeroCanvas() {
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef({ targetX: 0, targetY: 0, x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;

    if (!canvas || !wrapper) {
      return;
    }

    const nextContext = canvas.getContext("2d");
    if (!nextContext) {
      return;
    }
    const context = nextContext;

    const imageCache = new Map<string, HTMLImageElement>();
    let frameId = 0;
    let disposed = false;
    let width = 0;
    let height = 0;
    let dpr = 1;

    function resizeCanvas() {
      const currentWrapper = wrapperRef.current;
      const currentCanvas = canvasRef.current;
      if (!currentWrapper) {
        return;
      }
      if (!currentCanvas) {
        return;
      }

      const rect = currentWrapper.getBoundingClientRect();
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      currentCanvas.width = Math.round(width * dpr);
      currentCanvas.height = Math.round(height * dpr);
      currentCanvas.style.width = `${width}px`;
      currentCanvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function loadImage(src: string) {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const cached = imageCache.get(src);
        if (cached) {
          resolve(cached);
          return;
        }

        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
          imageCache.set(src, image);
          resolve(image);
        };
        image.onerror = reject;
        image.src = src;
      });
    }

    function drawScene(time: number) {
      if (disposed) {
        return;
      }

      const seconds = time * 0.001;
      const pointer = pointerRef.current;
      pointer.x += (pointer.targetX - pointer.x) * 0.06;
      pointer.y += (pointer.targetY - pointer.y) * 0.06;
      const pointerScreenX = (pointer.x + 0.5) * width;
      const pointerScreenY = (pointer.y + 0.5) * height;

      context.clearRect(0, 0, width, height);

      const halo = context.createRadialGradient(
        width * 0.5 + pointer.x * 18,
        height * 0.3 + pointer.y * 14,
        0,
        width * 0.5,
        height * 0.45,
        Math.max(width, height) * 0.42,
      );
      if (resolvedTheme === "light") {
        halo.addColorStop(0, "rgba(95,115,145,0.14)");
        halo.addColorStop(0.4, "rgba(95,115,145,0.05)");
        halo.addColorStop(1, "rgba(95,115,145,0)");
      } else {
        halo.addColorStop(0, "rgba(255,255,255,0.12)");
        halo.addColorStop(0.4, "rgba(255,255,255,0.045)");
        halo.addColorStop(1, "rgba(255,255,255,0)");
      }
      context.fillStyle = halo;
      context.fillRect(0, 0, width, height);

      context.strokeStyle =
        resolvedTheme === "light"
          ? "rgba(95,115,145,0.12)"
          : "rgba(255,255,255,0.045)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(width * 0.5 - 160, height * 0.27);
      context.lineTo(width * 0.5 + 160, height * 0.27);
      context.moveTo(width * 0.5 - 110, height * 0.78);
      context.lineTo(width * 0.5 + 110, height * 0.78);
      context.stroke();

      const compact = width < 720;
      const activeShapes = compact ? mobileHeroShapes : heroShapes.filter((shape) => !shape.hideOnMobile || !compact);

      activeShapes.forEach((shape, index) => {

        const image = imageCache.get(shape.src);
        if (!image) {
          return;
        }

        const baseSize = Math.min(width, height) * shape.size;
        const scale = compact ? 0.86 : 1;
        const drawWidth = baseSize * scale;
        const drawHeight = (drawWidth * image.naturalHeight) / image.naturalWidth;
        const offsetX = Math.cos(seconds * 0.38 + index * 0.6) * 8 + pointer.x * shape.depth;
        const offsetY = Math.sin(seconds * 0.54 + index * 0.72) * 10 + pointer.y * shape.depth * 0.72;
        const rotation = shape.baseRotation + Math.sin(seconds * 0.32 + index * 0.48) * shape.rotationAmplitude;
        let x = width * shape.x + offsetX;
        let y = height * shape.y + offsetY;

        if (pointer.active) {
          const dx = x - pointerScreenX;
          const dy = y - pointerScreenY;
          const radius = compact ? 120 : 180;
          const distance = Math.hypot(dx, dy);

          if (distance < radius) {
            const force = ((radius - distance) / radius) ** 2;
            const safeDistance = Math.max(distance, 0.001);
            const directionX = dx / safeDistance;
            const directionY = dy / safeDistance;
            const intensity = compact ? 18 : 34;
            x += directionX * force * intensity;
            y += directionY * force * intensity;
          }
        }

        context.save();
        context.translate(x, y);
        context.rotate(rotation);
        context.globalAlpha = compact ? 0.9 : 1;
        context.drawImage(image, -drawWidth * 0.5, -drawHeight * 0.5, drawWidth, drawHeight);
        context.restore();
      });

      frameId = window.requestAnimationFrame(drawScene);
    }

    function handlePointerMove(event: PointerEvent) {
      const currentWrapper = wrapperRef.current;
      if (!currentWrapper) {
        return;
      }

      const rect = currentWrapper.getBoundingClientRect();
      const nextX = (event.clientX - rect.left) / rect.width - 0.5;
      const nextY = (event.clientY - rect.top) / rect.height - 0.5;
      pointerRef.current.targetX = nextX;
      pointerRef.current.targetY = nextY;
      pointerRef.current.active = true;
    }

    function handlePointerLeave() {
      pointerRef.current.targetX = 0;
      pointerRef.current.targetY = 0;
      pointerRef.current.active = false;
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    wrapper.addEventListener("pointermove", handlePointerMove);
    wrapper.addEventListener("pointerleave", handlePointerLeave);

    Promise.all([...new Set(heroShapes.map((shape) => shape.src))].map(loadImage))
      .then(() => {
        if (!disposed) {
          frameId = window.requestAnimationFrame(drawScene);
        }
      })
      .catch(() => {
        // Fail quietly so the hero still renders without the animated layer.
      });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resizeCanvas);
      wrapper.removeEventListener("pointermove", handlePointerMove);
      wrapper.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [resolvedTheme]);

  return (
    <div className="pollex-hero-canvas-layer" ref={wrapperRef} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
