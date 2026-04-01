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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isScreenMenuOpen, setIsScreenMenuOpen] = useState(false);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      setFrameSize({
        width: element.clientWidth || 375,
        height:
          element.clientHeight ||
          Math.round((element.clientWidth || 375) * (812 / 375)),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isExpanded]);

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
            1.0: "#ff5f56",
          },
        });
      }
    };

    void mountHeatmap();
  }, []);

  useEffect(() => {
    const loadHeatmap = async () => {
      setIsLoading(true);
      const response = await fetch(
        `/api/heatmap?screen=${encodeURIComponent(selectedScreen)}`,
        { cache: "no-store" },
      );
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
      const response = await fetch(
        `/api/screenshots?screen=${encodeURIComponent(selectedScreen)}&latest=true`,
        { cache: "no-store" },
      );
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
  }, [points, frameSize]);

  const activeLayout = phoneLayouts[selectedScreen] ?? phoneLayouts.kyc_form;
  const totalPoints = points.reduce((sum, point) => sum + point.count, 0);
  const totalClusters = points.length;
  const sortedPoints = useMemo(
    () => [...points].sort((a, b) => b.count - a.count),
    [points],
  );
  const selectedPoint = sortedPoints[selectedPointIndex] ?? null;
  const csv = useMemo(() => toCsv(sortedPoints), [sortedPoints]);

  const viewer = (
    <div className="heatmap-shell">
      <div className="heatmap-topbar">
        <div className="heatmap-title-block">
          <div className="heatmap-screen-menu" ref={screenMenuRef}>
            <button
              aria-expanded={isScreenMenuOpen}
              aria-haspopup="menu"
              className={`heatmap-screen-trigger ${isScreenMenuOpen ? "open" : ""}`}
              type="button"
              onClick={() => setIsScreenMenuOpen((open) => !open)}
            >
              <span className="heatmap-screen-kicker">Screen</span>
              <span className="heatmap-screen-value">{selectedScreen}</span>
              <span className="heatmap-screen-chevron" aria-hidden="true">
                ▾
              </span>
            </button>

            {isScreenMenuOpen ? (
              <div className="heatmap-screen-popover" role="menu">
                {screens.map((screen) => (
                  <button
                    className={`heatmap-screen-option ${screen === selectedScreen ? "active" : ""}`}
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
          <Tag tone="accent">{totalPoints} taps</Tag>
          <Tag>{totalClusters} clusters</Tag>
        </div>

        <div className="heatmap-controls">
          <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv(`maze-heatmap-${selectedScreen}.csv`, csv)}>
            Export CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setIsExpanded(true)}>
            Expand
          </button>
        </div>
      </div>

      <div className="heatmap-workspace">
        <div className="heatmap-stage">
          <div
            ref={frameRef}
            className={`phone-frame ${isExpanded ? "phone-frame-expanded" : ""}`}
          >
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
                        background:
                          index === activeLayout.length - 1
                            ? "rgba(108,127,255,0.2)"
                            : "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.06)",
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
                    opacity: 0.42,
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
          <p className="subtext heatmap-status">
            {isLoading
              ? "Loading heatmap..."
              : "Tap density is rendered from normalized coordinates returned by the backend."}
          </p>
        </div>

        <div className="heatmap-sidepanel">
          <div className="heatmap-summary">
            <div>
              <span>Total taps</span>
              <strong>{totalPoints}</strong>
            </div>
            <div>
              <span>Hotspots</span>
              <strong>{totalClusters}</strong>
            </div>
            <div>
              <span>Peak cluster</span>
              <strong>{sortedPoints[0]?.count ?? 0}</strong>
            </div>
          </div>

          <div className="heatmap-cluster-list">
            {sortedPoints.length > 0 ? (
              sortedPoints.slice(0, 8).map((point, index) => (
                <button
                  key={`${point.x}-${point.y}-${point.count}-${index}`}
                  type="button"
                  className={`heatmap-cluster-row ${index === selectedPointIndex ? "active" : ""}`}
                  onClick={() => setSelectedPointIndex(index)}
                >
                  <div>
                    <strong>Hotspot {index + 1}</strong>
                    <span>
                      x {point.x.toFixed(2)} / y {point.y.toFixed(2)}
                    </span>
                  </div>
                  <Tag tone={index === 0 ? "red" : index < 3 ? "amber" : "default"}>
                    {point.count}
                  </Tag>
                </button>
              ))
            ) : (
              <p className="empty-copy">No hotspot rows yet for this screen.</p>
            )}
          </div>

          {selectedPoint ? (
            <div className="heatmap-inspector">
              <div className="heading">Inspector</div>
              <div className="inspect-grid">
                <div className="inspect-row">
                  <span>Screen</span>
                  <strong>{selectedScreen}</strong>
                </div>
                <div className="inspect-row">
                  <span>X coordinate</span>
                  <strong>{selectedPoint.x.toFixed(3)}</strong>
                </div>
                <div className="inspect-row">
                  <span>Y coordinate</span>
                  <strong>{selectedPoint.y.toFixed(3)}</strong>
                </div>
                <div className="inspect-row">
                  <span>Tap count</span>
                  <strong>{selectedPoint.count}</strong>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {viewer}
      {isExpanded ? (
        <div className="overlay-shell" onClick={() => setIsExpanded(false)}>
          <div className="overlay-panel overlay-heatmap" onClick={(event) => event.stopPropagation()}>
            <div className="overlay-head">
              <div>
                <div className="heading">Expanded heatmap</div>
                <p className="panel-copy">
                  Inspect hotspot rows and the canvas together in a larger responsive view.
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsExpanded(false)}>
                Close
              </button>
            </div>
            {viewer}
          </div>
        </div>
      ) : null}
    </>
  );
}
