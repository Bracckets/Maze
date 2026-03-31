"use client";

import { useEffect, useRef, useState } from "react";

type HeatmapPoint = {
  x: number;
  y: number;
  count: number;
};

const phoneLayouts: Record<string, { top: string; left: string; width: string; height: string; radius?: string }[]> = {
  welcome: [
    { top: "12%", left: "10%", width: "56%", height: "4%" },
    { top: "20%", left: "10%", width: "72%", height: "8%", radius: "18px" },
    { top: "78%", left: "10%", width: "80%", height: "8%", radius: "20px" }
  ],
  login: [
    { top: "18%", left: "10%", width: "60%", height: "4%" },
    { top: "34%", left: "10%", width: "80%", height: "8%", radius: "18px" },
    { top: "46%", left: "10%", width: "80%", height: "8%", radius: "18px" },
    { top: "76%", left: "10%", width: "80%", height: "8%", radius: "20px" }
  ],
  kyc_form: [
    { top: "12%", left: "10%", width: "54%", height: "4%" },
    { top: "24%", left: "10%", width: "80%", height: "7%", radius: "16px" },
    { top: "36%", left: "10%", width: "80%", height: "7%", radius: "16px" },
    { top: "48%", left: "10%", width: "80%", height: "7%", radius: "16px" },
    { top: "80%", left: "10%", width: "80%", height: "8%", radius: "20px" }
  ]
};

type Props = {
  initialScreen: string;
  screens: string[];
};

export function HeatmapViewer({ initialScreen, screens }: Props) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const heatmapLayerRef = useRef<HTMLDivElement | null>(null);
  const heatmapInstanceRef = useRef<any>(null);
  const [selectedScreen, setSelectedScreen] = useState(initialScreen);
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [frameSize, setFrameSize] = useState({ width: 375, height: 812 });

  useEffect(() => {
    const element = frameRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      setFrameSize({
        width: element.clientWidth || 375,
        height: element.clientHeight || Math.round((element.clientWidth || 375) * (812 / 375))
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mountHeatmap = async () => {
      if (!heatmapLayerRef.current) {
        return;
      }

      const heatmapModule: any = await import("heatmap.js");
      const h337 = heatmapModule.default ?? heatmapModule;

      if (!heatmapInstanceRef.current) {
        heatmapInstanceRef.current = h337.create({
          container: heatmapLayerRef.current,
          radius: 42,
          maxOpacity: 0.78,
          minOpacity: 0.1,
          blur: 0.88,
          gradient: {
            0.2: "#4f8bff",
            0.55: "#ffe168",
            1.0: "#ff5f56"
          }
        });
      }
    };

    void mountHeatmap();
  }, []);

  useEffect(() => {
    const loadHeatmap = async () => {
      setIsLoading(true);
      const response = await fetch(`/api/heatmap?screen=${encodeURIComponent(selectedScreen)}`, { cache: "no-store" });
      const data = await response.json();
      setPoints(response.ok ? data.points : []);
      setIsLoading(false);
    };

    void loadHeatmap();
  }, [selectedScreen]);

  useEffect(() => {
    const loadScreenshot = async () => {
      const response = await fetch(`/api/screenshots?screen=${encodeURIComponent(selectedScreen)}&latest=true`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data) || data.length === 0) {
        setScreenshotUrl(null);
        return;
      }
      setScreenshotUrl(typeof data[0].signed_url === "string" ? data[0].signed_url : null);
    };
    void loadScreenshot();
  }, [selectedScreen]);

  useEffect(() => {
    if (!heatmapInstanceRef.current) {
      return;
    }

    heatmapInstanceRef.current.setData({
      max: Math.max(...points.map((point) => point.count), 1),
      data: points.map((point) => ({
        x: Math.round(point.x * frameSize.width),
        y: Math.round(point.y * frameSize.height),
        value: point.count
      }))
    });
  }, [points, frameSize]);

  const activeLayout = phoneLayouts[selectedScreen] ?? phoneLayouts.kyc_form;
  const totalPoints = points.reduce((sum, point) => sum + point.count, 0);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="heading">{selectedScreen}</span>
          <span className="tag tag-accent">{totalPoints} taps</span>
          <span className="tag tag-default">{points.length} clustered points</span>
        </div>

        <div className="field" style={{ minWidth: 180 }}>
          <label htmlFor="heatmap-screen">Screen</label>
          <select id="heatmap-screen" onChange={(event) => setSelectedScreen(event.target.value)} value={selectedScreen}>
            {screens.map((screen) => (
              <option key={screen} value={screen}>
                {screen}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", placeItems: "center" }}>
        <div
          ref={frameRef}
          style={{
            width: "min(100%, 375px)",
            aspectRatio: "375 / 812",
            borderRadius: 42,
            padding: 10,
            background: "linear-gradient(180deg, #08090d 0%, #141821 100%)",
            boxShadow: "0 28px 70px rgba(0,0,0,0.55)"
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              overflow: "hidden",
              borderRadius: 34,
              background: "linear-gradient(180deg, #151922 0%, #0f1219 100%)",
              border: "1px solid rgba(255,255,255,0.05)"
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 14,
                left: "50%",
                transform: "translateX(-50%)",
                width: 96,
                height: 18,
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)"
              }}
            />

            {activeLayout.map((shape, index) => (
              <div
                key={`${selectedScreen}-${index}`}
                style={{
                  position: "absolute",
                  top: shape.top,
                  left: shape.left,
                  width: shape.width,
                  height: shape.height,
                  borderRadius: shape.radius ?? 12,
                  background: index === activeLayout.length - 1 ? "rgba(108,127,255,0.2)" : "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.06)"
                }}
              />
            ))}

            {screenshotUrl ? (
              <img
                alt={`Latest ${selectedScreen} screenshot`}
                src={screenshotUrl}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.42,
                }}
              />
            ) : null}

            <div ref={heatmapLayerRef} style={{ position: "absolute", inset: 0 }} />
          </div>
        </div>
      </div>

      <p className="subtext" style={{ fontSize: "0.84rem", textAlign: "center" }}>
        {isLoading ? "Loading heatmap..." : "Tap density is rendered from normalized mobile coordinates returned by the backend."}
      </p>
    </div>
  );
}
