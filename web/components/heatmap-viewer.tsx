"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { PollexAppIcon } from "@/components/pollex-app-icon";
import { useTheme } from "@/components/theme-provider";
import { Tag } from "@/components/ui";

type HeatmapPoint = {
  x: number;
  y: number;
  count: number;
};

type DeviceClass = "phone" | "desktop";

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

const desktopLayouts: Record<
  string,
  { top: string; left: string; width: string; height: string; radius?: string; tone?: "accent" | "default" }[]
> = {
  welcome: [
    { top: "6%", left: "4%", width: "92%", height: "10%", radius: "18px" },
    { top: "24%", left: "6%", width: "54%", height: "34%", radius: "26px" },
    { top: "24%", left: "64%", width: "30%", height: "18%", radius: "22px" },
    { top: "48%", left: "64%", width: "30%", height: "28%", radius: "22px" },
    { top: "68%", left: "6%", width: "88%", height: "16%", radius: "22px", tone: "accent" },
  ],
  login: [
    { top: "6%", left: "4%", width: "92%", height: "10%", radius: "18px" },
    { top: "24%", left: "28%", width: "44%", height: "10%", radius: "18px" },
    { top: "40%", left: "28%", width: "44%", height: "14%", radius: "20px" },
    { top: "58%", left: "28%", width: "44%", height: "14%", radius: "20px" },
    { top: "78%", left: "28%", width: "44%", height: "12%", radius: "999px", tone: "accent" },
  ],
  kyc_form: [
    { top: "6%", left: "4%", width: "92%", height: "10%", radius: "18px" },
    { top: "22%", left: "6%", width: "88%", height: "12%", radius: "18px" },
    { top: "38%", left: "6%", width: "42%", height: "18%", radius: "22px" },
    { top: "38%", left: "52%", width: "42%", height: "18%", radius: "22px" },
    { top: "62%", left: "6%", width: "88%", height: "14%", radius: "18px" },
    { top: "82%", left: "6%", width: "32%", height: "10%", radius: "999px", tone: "accent" },
  ],
};

type Props = {
  initialScreen: string;
  screens: string[];
};

type HeatmapPayload = {
  points?: HeatmapPoint[];
  deviceClass?: DeviceClass;
  availableDeviceClasses?: string[];
};
type ResolvedHeatmapPayload = {
  points: HeatmapPoint[];
  deviceClass: DeviceClass;
  availableDeviceClasses: DeviceClass[];
};

function isDeviceClass(value: string | undefined | null): value is DeviceClass {
  return value === "phone" || value === "desktop";
}

function isHeatmapPayload(value: unknown): value is ResolvedHeatmapPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as HeatmapPayload;
  return (
    Array.isArray(payload.points) &&
    payload.points.every(
      (point) =>
        !!point &&
        typeof point === "object" &&
        typeof point.x === "number" &&
        typeof point.y === "number" &&
        typeof point.count === "number",
    ) &&
    isDeviceClass(payload.deviceClass) &&
    Array.isArray(payload.availableDeviceClasses) &&
    payload.availableDeviceClasses.every((deviceClass) => isDeviceClass(deviceClass))
  );
}

function toCsv(points: HeatmapPoint[]) {
  const lines = [["x", "y", "count"], ...points.map((point) => [point.x, point.y, point.count])];
  return lines.map((line) => line.join(",")).join("\n");
}

function toCanvasCoordinate(value: number, size: number) {
  const max = Math.max(size - 1, 0);
  return Math.min(Math.max(Math.round(value * size), 0), max);
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

async function readJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function HeatmapViewer({ initialScreen, screens }: Props) {
  const { resolvedTheme } = useTheme();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const heatmapLayerRef = useRef<HTMLDivElement | null>(null);
  const heatmapInstanceRef = useRef<any>(null);
  const screenMenuRef = useRef<HTMLDivElement | null>(null);
  const resolvedHeatmapKeyRef = useRef<string | null>(null);
  const lastScreenRef = useRef<string | null>(null);
  const [selectedScreen, setSelectedScreen] = useState(initialScreen);
  const [selectedDeviceClass, setSelectedDeviceClass] = useState<DeviceClass>("phone");
  const [availableDeviceClasses, setAvailableDeviceClasses] = useState<DeviceClass[]>(["phone"]);
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotSize, setScreenshotSize] = useState<{ width: number; height: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [frameSize, setFrameSize] = useState({ width: 375, height: 812 });
  const [heatmapLayerSize, setHeatmapLayerSize] = useState({ width: 0, height: 0 });
  const [heatmapRenderKey, setHeatmapRenderKey] = useState(0);
  const [selectedPointIndex, setSelectedPointIndex] = useState(0);
  const [isScreenMenuOpen, setIsScreenMenuOpen] = useState(false);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      setFrameSize({
        width: element.clientWidth || 375,
        height:
          screenshotSize && screenshotSize.width > 0 && screenshotSize.height > 0
            ? Math.round((element.clientWidth || 375) * (screenshotSize.height / screenshotSize.width))
            : element.clientHeight || (selectedDeviceClass === "desktop" ? 760 : Math.round((element.clientWidth || 375) * (812 / 375))),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [screenshotSize, selectedDeviceClass]);

  useEffect(() => {
    const element = heatmapLayerRef.current;
    if (!element) {
      return;
    }

    const updateLayerSize = () => {
      const { width, height } = element.getBoundingClientRect();
      setHeatmapLayerSize({
        width: Math.round(width),
        height: Math.round(height),
      });
    };

    updateLayerSize();
    const observer = new ResizeObserver(updateLayerSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [selectedDeviceClass]);

  useEffect(() => {
    const container = heatmapLayerRef.current;
    if (!container || heatmapLayerSize.width <= 0 || heatmapLayerSize.height <= 0) {
      heatmapInstanceRef.current = null;
      return;
    }

    let isCancelled = false;

    const mountHeatmap = async () => {
      const rootStyles = getComputedStyle(document.documentElement);
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      const heatmapModule: any = await import("heatmap.js");
      if (isCancelled) {
        return;
      }

      const h337 = heatmapModule.default ?? heatmapModule;

      heatmapInstanceRef.current = h337.create({
        container,
        radius: 42,
        maxOpacity: 0.72,
        minOpacity: 0.08,
        blur: 0.9,
        gradient: {
          0.2: rootStyles.getPropertyValue("--heatmap-gradient-low").trim() || "#7db0ff",
          0.55: rootStyles.getPropertyValue("--heatmap-gradient-mid").trim() || "#ffd572",
          1.0: rootStyles.getPropertyValue("--heatmap-gradient-high").trim() || "#ff7d67",
        },
      });
      setHeatmapRenderKey((key) => key + 1);
    };

    heatmapInstanceRef.current = null;
    void mountHeatmap();

    return () => {
      isCancelled = true;
      heatmapInstanceRef.current = null;
    };
  }, [heatmapLayerSize.height, heatmapLayerSize.width, resolvedTheme, selectedDeviceClass]);

  useEffect(() => {
    const loadHeatmap = async () => {
      const requestKey = `${selectedScreen}:${selectedDeviceClass}`;
      if (resolvedHeatmapKeyRef.current === requestKey) {
        return;
      }

      setIsLoading(true);
      const screenChanged = lastScreenRef.current !== selectedScreen;
      lastScreenRef.current = selectedScreen;

      const fetchHeatmap = async (deviceClass?: DeviceClass) => {
        const query = new URLSearchParams({ screen: selectedScreen });
        if (deviceClass) {
          query.set("device_class", deviceClass);
        }

        const response = await fetch(`/api/heatmap?${query.toString()}`, { cache: "no-store" });
        const data = await readJsonSafely(response);
        if (!response.ok || !isHeatmapPayload(data)) {
          return null;
        }
        return data;
      };

      if (screenChanged) {
        const baseHeatmap = await fetchHeatmap();
        if (!baseHeatmap) {
          resolvedHeatmapKeyRef.current = null;
          setPoints([]);
          setAvailableDeviceClasses([selectedDeviceClass]);
          setIsLoading(false);
          return;
        }

        const nextAvailableDeviceClasses = baseHeatmap.availableDeviceClasses.filter((deviceClass) => isDeviceClass(deviceClass));
        const resolvedDeviceClass =
          nextAvailableDeviceClasses.includes(selectedDeviceClass) ? selectedDeviceClass : baseHeatmap.deviceClass;
        if (resolvedDeviceClass !== baseHeatmap.deviceClass) {
          const explicitHeatmap = await fetchHeatmap(resolvedDeviceClass);
          if (!explicitHeatmap) {
            resolvedHeatmapKeyRef.current = null;
            setPoints([]);
            setSelectedPointIndex(0);
            setAvailableDeviceClasses(
              nextAvailableDeviceClasses.length > 0 ? nextAvailableDeviceClasses : [resolvedDeviceClass],
            );
            setIsLoading(false);
            return;
          }

          resolvedHeatmapKeyRef.current = `${selectedScreen}:${explicitHeatmap.deviceClass}`;
          setPoints(explicitHeatmap.points);
          setSelectedPointIndex(0);
          setAvailableDeviceClasses(
            nextAvailableDeviceClasses.length > 0 ? nextAvailableDeviceClasses : [explicitHeatmap.deviceClass],
          );
          if (explicitHeatmap.deviceClass !== selectedDeviceClass) {
            setSelectedDeviceClass(explicitHeatmap.deviceClass);
          }
          setIsLoading(false);
          return;
        }

        const finalDeviceClass = baseHeatmap.deviceClass;
        resolvedHeatmapKeyRef.current = `${selectedScreen}:${finalDeviceClass}`;
        setPoints(baseHeatmap.points);
        setSelectedPointIndex(0);
        setAvailableDeviceClasses(
          nextAvailableDeviceClasses.length > 0 ? nextAvailableDeviceClasses : [finalDeviceClass],
        );
        if (finalDeviceClass !== selectedDeviceClass) {
          setSelectedDeviceClass(finalDeviceClass);
        }
        setIsLoading(false);
        return;
      }

      const heatmap = await fetchHeatmap(selectedDeviceClass);
      if (!heatmap) {
        resolvedHeatmapKeyRef.current = null;
        setPoints([]);
        setAvailableDeviceClasses([selectedDeviceClass]);
        setIsLoading(false);
        return;
      }

      resolvedHeatmapKeyRef.current = requestKey;
      setPoints(heatmap.points);
      setSelectedPointIndex(0);
      setAvailableDeviceClasses(
        heatmap.availableDeviceClasses.length > 0 ? heatmap.availableDeviceClasses : [heatmap.deviceClass],
      );
      setIsLoading(false);
    };

    void loadHeatmap();
  }, [selectedDeviceClass, selectedScreen]);

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
      const query = new URLSearchParams({
        screen: selectedScreen,
        latest: "true",
        device_class: selectedDeviceClass,
      });
      const response = await fetch(`/api/screenshots?${query.toString()}`, {
        cache: "no-store",
      });
      const data = await readJsonSafely(response);
      if (!response.ok || !Array.isArray(data) || data.length === 0) {
        setScreenshotUrl(null);
        setScreenshotSize(null);
        return;
      }
      const latest = data[0] as { signed_url?: unknown; width?: unknown; height?: unknown };
      const nextScreenshotUrl = typeof latest.signed_url === "string" ? latest.signed_url : null;
      const nextScreenshotWidth = typeof latest.width === "number" && latest.width > 0 ? latest.width : null;
      const nextScreenshotHeight = typeof latest.height === "number" && latest.height > 0 ? latest.height : null;

      setScreenshotUrl(nextScreenshotUrl);
      setScreenshotSize(
        nextScreenshotUrl && nextScreenshotWidth && nextScreenshotHeight
          ? { width: nextScreenshotWidth, height: nextScreenshotHeight }
          : null,
      );
    };

    void loadScreenshot();
  }, [selectedDeviceClass, selectedScreen]);

  useEffect(() => {
    if (
      !heatmapInstanceRef.current ||
      frameSize.width <= 0 ||
      frameSize.height <= 0 ||
      heatmapLayerSize.width <= 0 ||
      heatmapLayerSize.height <= 0
    ) {
      return;
    }

    heatmapInstanceRef.current.setData({
      max: Math.max(...points.map((point) => point.count), 1),
      data: points.map((point) => ({
        x: toCanvasCoordinate(point.x, frameSize.width),
        y: toCanvasCoordinate(point.y, frameSize.height),
        value: point.count,
      })),
    });
  }, [frameSize, heatmapLayerSize, heatmapRenderKey, points]);

  const activePhoneLayout = phoneLayouts[selectedScreen] ?? phoneLayouts.kyc_form;
  const activeDesktopLayout = desktopLayouts[selectedScreen] ?? desktopLayouts.kyc_form;
  const totalPoints = points.reduce((sum, point) => sum + point.count, 0);
  const sortedPoints = useMemo(() => [...points].sort((a, b) => b.count - a.count), [points]);
  const selectedPoint = sortedPoints[selectedPointIndex] ?? null;
  const csv = useMemo(() => toCsv(sortedPoints), [sortedPoints]);
  const showDeviceTabs = availableDeviceClasses.length > 1;
  const activeDeviceLabel = selectedDeviceClass === "desktop" ? "desktop" : "phone";
  const viewportStyle = screenshotSize ? { aspectRatio: `${screenshotSize.width} / ${screenshotSize.height}` } : undefined;

  return (
    <div className="pollex-heatmap">
      <div className="pollex-heatmap-topbar">
        <div>
          <div className="pollex-section-heading">
            <span className="pollex-section-heading-icon" aria-hidden="true">
              <PollexAppIcon icon="heatmap" />
            </span>
            <h2 className="heading">Interaction surface</h2>
          </div>
          <p className="panel-copy">Hotspots, screenshot context, and tap density in one focused frame.</p>
        </div>

        <div className="pollex-heatmap-topbar-actions">
          {showDeviceTabs ? (
            <div className="pollex-tabbar pollex-tabbar-subtle" aria-label="Device class">
              {availableDeviceClasses.map((deviceClass) => (
                <button
                  key={deviceClass}
                  type="button"
                  className={`pollex-tab ${deviceClass === selectedDeviceClass ? "active" : ""}`.trim()}
                  onClick={() => setSelectedDeviceClass(deviceClass)}
                >
                  {deviceClass === "desktop" ? "Desktop" : "Phone"}
                </button>
              ))}
            </div>
          ) : null}

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

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => downloadCsv(`pollex-heatmap-${selectedScreen}-${selectedDeviceClass}.csv`, csv)}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="pollex-heatmap-frame">
        <aside className="pollex-heatmap-column">
          <div className="pollex-heatmap-column-head">
            <span className="pollex-section-label-with-icon">
              <PollexAppIcon icon="chart" />
              <span>Data</span>
            </span>
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
          <div className={`pollex-device-frame pollex-device-frame-${selectedDeviceClass}`.trim()}>
            {selectedDeviceClass === "phone" ? (
              <div className="pollex-phone-shell">
                <div className="pollex-phone-notch" />
                <div ref={viewportRef} className="pollex-device-viewport pollex-device-viewport-phone" style={viewportStyle}>
                  {!screenshotUrl
                    ? activePhoneLayout.map((shape, index) => (
                        <div
                          key={`${selectedScreen}-${selectedDeviceClass}-${index}`}
                          style={{
                            position: "absolute",
                            top: shape.top,
                            left: shape.left,
                            width: shape.width,
                            height: shape.height,
                            borderRadius: shape.radius ?? 12,
                            background:
                              index === activePhoneLayout.length - 1
                                ? "var(--heatmap-placeholder-accent)"
                                : "var(--heatmap-placeholder)",
                            border: "1px solid var(--heatmap-placeholder-border)",
                          }}
                        />
                      ))
                    : null}

                  {screenshotUrl ? (
                    <img
                      alt={`Latest ${selectedScreen} ${activeDeviceLabel} screenshot`}
                      src={screenshotUrl}
                      className="pollex-heatmap-screenshot"
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
            ) : (
              <div className="pollex-desktop-shell">
                <div className="pollex-desktop-toolbar">
                  <span />
                  <span />
                  <span />
                </div>
                <div ref={viewportRef} className="pollex-device-viewport pollex-device-viewport-desktop" style={viewportStyle}>
                  {!screenshotUrl
                    ? activeDesktopLayout.map((shape, index) => (
                        <div
                          key={`${selectedScreen}-${selectedDeviceClass}-${index}`}
                          style={{
                            position: "absolute",
                            top: shape.top,
                            left: shape.left,
                            width: shape.width,
                            height: shape.height,
                            borderRadius: shape.radius ?? 18,
                            background:
                              shape.tone === "accent"
                                ? "var(--heatmap-placeholder-accent)"
                                : "var(--heatmap-placeholder)",
                            border: "1px solid var(--heatmap-placeholder-border)",
                          }}
                        />
                      ))
                    : null}

                  {screenshotUrl ? (
                    <img
                      alt={`Latest ${selectedScreen} ${activeDeviceLabel} screenshot`}
                      src={screenshotUrl}
                      className="pollex-heatmap-screenshot"
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
            )}
          </div>

          <p className="pollex-heatmap-status">
            {isLoading
              ? "Loading heatmap..."
              : screenshotSize
                ? `Tap coordinates are rendered against the captured ${activeDeviceLabel} content surface.`
                : `Normalized tap coordinates are rendered on the active ${activeDeviceLabel} viewport.`}
          </p>
        </div>

        <aside className="pollex-heatmap-column pollex-heatmap-column-scroll">
          <div className="pollex-heatmap-column-head">
            <span className="pollex-section-label-with-icon">
              <PollexAppIcon icon="insight" />
              <span>Hotspots</span>
            </span>
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
              <p className="empty-copy">No hotspot rows yet for this screen and device class.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
