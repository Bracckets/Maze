"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Tag } from "@/components/ui";

type HeatmapPoint = {
  x: number;
  y: number;
  count: number;
};

const phoneLayouts: Record<
  string,
  { top: string; left: string; width: string; height: string; radius?: string }[]
> = {
  welcome: [
    { top: "12%", left: "10%", width: "56%", height: "4%" },
    { top: "20%", left: "10%", width: "72%", height: "8%", radius: "18px" },
    { top: "78%", left: "10%", width: "80%", height: "8%", radius: "20px" },
  ],
  login: [
    { top: "18%", left: "10%", width: "60%", height: "4%" },
    { top: "34%", left: "10%", width: "80%", height: "8%", radius: "18px" },
    { top: "46%", left: "10%", width: "80%", height: "8%", radius: "18px" },
    { top: "76%", left: "10%", width: "80%", height: "8%", radius: "20px" },
  ],
  kyc_form: [
    { top: "12%", left: "10%", width: "54%", height: "4%" },
    { top: "24%", left: "10%", width: "80%", height: "7%", radius: "16px" },
    { top: "36%", left: "10%", width: "80%", height: "7%", radius: "16px" },
    { top: "48%", left: "10%", width: "80%", height: "7%", radius: "16px" },
    { top: "80%", left: "10%", width: "80%", height: "8%", radius: "20px" },
  ],
};

type Props = {
  initialScreen: string;
  screens: string[];
};

function toCsv(points: HeatmapPoint[]) {
  const lines = [["x", "y", "count"], ...points.map((point) => [point.x, point.y, point.count])];
  return lines.map((line) => line.join(",")).join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function HeatmapViewer({ initialScreen, screens }: Props) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const heatmapLayerRef = useRef<HTMLDivElement | null>(null);
  const heatmapInstanceRef = useRef<any>(null);
  const screenMenuRef = useRef<HTMLDivElement | null>(null);
  const [selectedScreen, setSelectedScreen] = useState(initialScreen);
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [frameSize, setFrameSize] = useState({ width: 375, height: 812 });
  const [selectedPointIndex, setSelectedPointIndex] = useState(0);
  const [isScreenMenuOpen, setIsScreenMenuOpen] = useState(false);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      setFrameSize({
        width: element.clientWidth || 375,
        height: element.clientHeight || Math.round((element.clientWidth || 375) * (812 / 375)),
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
          maxOpacity: 0.72,
          minOpacity: 0.08,
          blur: 0.9,
          gradient: {
            0.2: "#7db0ff",
            0.55: "#ffd572",
            1.0: "#ff7d67",
          },
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
      const nextPoints = response.ok ? data.points : [];
      setPoints(nextPoints);
      setSelectedPointIndex(0);
      setIsLoading(false);
    };

    void loadHeatmap();
  }, [selectedScreen]);

  useEffect(() => {
    if (!isScreenMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!screenMenuRef.current?.contains(event.target as Node)) {
        setIsScreenMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsScreenMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isScreenMenuOpen]);

  useEffect(() => {
    const loadScreenshot = async () => {
      const response = await fetch(`/api/screenshots?screen=${encodeURIComponent(selectedScreen)}&latest=true`, {
        cache: "no-store",
      });
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
        value: point.count,
      })),
    });
  }, [frameSize, points]);

  const activeLayout = phoneLayouts[selectedScreen] ?? phoneLayouts.kyc_form;
  const totalPoints = points.reduce((sum, point) => sum + point.count, 0);
  const sortedPoints = useMemo(() => [...points].sort((a, b) => b.count - a.count), [points]);
  const selectedPoint = sortedPoints[selectedPointIndex] ?? null;
  const csv = useMemo(() => toCsv(sortedPoints), [sortedPoints]);

  return (
    <div className="pollex-heatmap">
      <div className="pollex-heatmap-topbar">
        <div>
          <h2 className="heading">Interaction surface</h2>
          <p className="panel-copy">Hotspots, screenshot context, and tap density in one minimal frame.</p>
        </div>

        <div className="pollex-heatmap-topbar-actions">
          <div className="surface-select" ref={screenMenuRef}>
            <button
              aria-expanded={isScreenMenuOpen}
              aria-haspopup="menu"
              className={`surface-select-trigger ${isScreenMenuOpen ? "open" : ""}`.trim()}
              type="button"
              onClick={() => setIsScreenMenuOpen((open) => !open)}
            >
              <span className="surface-select-value">{selectedScreen.toUpperCase()}</span>
              <span className="surface-select-chevron" aria-hidden="true">
                ▾
              </span>
            </button>

            {isScreenMenuOpen ? (
              <div className="surface-select-popover" role="menu">
                {screens.map((screen) => (
                  <button
                    className={`surface-select-option ${screen === selectedScreen ? "active" : ""}`.trim()}
                    key={screen}
                    role="menuitemradio"
                    type="button"
                    onClick={() => {
                      setSelectedScreen(screen);
                      setIsScreenMenuOpen(false);
                    }}
                  >
                    <span>{screen}</span>
                    {screen === selectedScreen ? <strong>Current</strong> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv(`pollex-heatmap-${selectedScreen}.csv`, csv)}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="pollex-heatmap-frame">
        <aside className="pollex-heatmap-column">
          <div className="pollex-heatmap-column-head">
            <span>Data</span>
          </div>
          <div className="pollex-heatmap-metric-list">
            <div className="pollex-heatmap-metric-card">
              <span>Total taps</span>
              <strong>{totalPoints}</strong>
            </div>
            <div className="pollex-heatmap-metric-card">
              <span>Hotspots</span>
              <strong>{sortedPoints.length}</strong>
            </div>
            <div className="pollex-heatmap-metric-card">
              <span>Peak cluster</span>
              <strong>{sortedPoints[0]?.count ?? 0}</strong>
            </div>
          </div>
        </aside>

        <div className="pollex-heatmap-stage">
          <div ref={frameRef} className="phone-frame pollex-phone-frame">
            <div className="phone-screen">
              <div className="phone-notch" />

              {!screenshotUrl
                ? activeLayout.map((shape, index) => (
                    <div
                      key={`${selectedScreen}-${index}`}
                      style={{
                        position: "absolute",
                        top: shape.top,
                        left: shape.left,
                        width: shape.width,
                        height: shape.height,
                        borderRadius: shape.radius ?? 12,
                        background: index === activeLayout.length - 1 ? "rgba(132, 171, 255, 0.16)" : "rgba(255, 255, 255, 0.045)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    />
                  ))
                : null}

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
                    opacity: 0.48,
                  }}
                />
              ) : null}

              {selectedPoint ? (
                <div
                  className="heatmap-focus-ring"
                  style={{
                    left: `${selectedPoint.x * 100}%`,
                    top: `${selectedPoint.y * 100}%`,
                  }}
                />
              ) : null}

              <div ref={heatmapLayerRef} style={{ position: "absolute", inset: 0 }} />
            </div>
          </div>

          <p className="pollex-heatmap-status">
            {isLoading ? "Loading heatmap..." : "Normalized tap coordinates are rendered directly on the current device frame."}
          </p>
        </div>

        <aside className="pollex-heatmap-column pollex-heatmap-column-scroll">
          <div className="pollex-heatmap-column-head">
            <span>Hotspots</span>
            <Tag tone="accent">{sortedPoints.length}</Tag>
          </div>
          <div className="pollex-hotspot-list">
            {sortedPoints.length > 0 ? (
              sortedPoints.map((point, index) => (
                <button
                  key={`${point.x}-${point.y}-${point.count}-${index}`}
                  type="button"
                  className={`pollex-hotspot-row ${index === selectedPointIndex ? "active" : ""}`.trim()}
                  onClick={() => setSelectedPointIndex(index)}
                >
                  <div>
                    <strong>Hotspot {index + 1}</strong>
                    <span>
                      x {point.x.toFixed(2)} / y {point.y.toFixed(2)}
                    </span>
                  </div>
                  <Tag tone={index === 0 ? "red" : index < 3 ? "amber" : "default"}>{point.count}</Tag>
                </button>
              ))
            ) : (
              <p className="empty-copy">No hotspot rows yet for this screen.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
