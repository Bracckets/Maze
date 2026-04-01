import { DashboardShell } from "@/components/site-shell";
import { HeatmapViewer } from "@/components/heatmap-viewer";
import { Card, Tag } from "@/components/ui";
import { getHeatmap, getSessionScreens } from "@/lib/site-data";

export default async function HeatmapPage() {
  const screens = await getSessionScreens();
  const initialScreen = screens[0] ?? "welcome";
  const initialHeatmap = await getHeatmap(initialScreen);
  const hasHeatmapData = initialHeatmap.points.length > 0 || screens.length > 0;

  return (
    <DashboardShell
      title="Heatmap explorer"
      subtitle="Inspect clustered tap behavior, expand the canvas, and export hotspot rows for mobile and web workflows."
    >
      <div style={{ display: "grid", gap: "var(--gap)" }}>
        <Card accent className="ops-panel">
          <HeatmapViewer
            initialScreen={initialHeatmap.screen}
            screens={screens.length > 0 ? screens : [initialHeatmap.screen]}
          />
        </Card>

        <div className="ops-kpis" style={{ marginBottom: 0 }}>
          <Card className="kpi-panel">
            <p className="metric-label">Color scale</p>
            <p className="heading" style={{ marginBottom: 8 }}>Low to high density</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Tag tone="accent">Blue</Tag>
              <Tag tone="amber">Yellow</Tag>
              <Tag tone="red">Red</Tag>
            </div>
          </Card>
          <Card className="kpi-panel">
            <p className="metric-label">Source</p>
            <p className="heading" style={{ marginBottom: 8 }}>/heatmap?screen=...</p>
            <p className="panel-copy">Normalized tap coordinates returned directly from the backend.</p>
          </Card>
          <Card className="kpi-panel">
            <p className="metric-label">Screenshot overlay</p>
            <p className="heading" style={{ marginBottom: 8 }}>Latest captured frame</p>
            <p className="panel-copy">The explorer overlays the freshest screenshot available for the selected screen.</p>
          </Card>
          <Card className="kpi-panel">
            <p className="metric-label">Data status</p>
            <p className="heading" style={{ marginBottom: 8 }}>
              {hasHeatmapData ? "Ready for inspection" : "Waiting for tap data"}
            </p>
            <p className="panel-copy">
              {hasHeatmapData
                ? "Expand the view or inspect individual hotspot rows."
                : "Once SDK traffic arrives, this view fills automatically."}
            </p>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
