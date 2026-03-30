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
      title="Heatmap"
      subtitle="Visualize where mobile users tap most often from your live workspace data."
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "var(--gap)" }}>
        <Card accent>
          <HeatmapViewer initialScreen={initialHeatmap.screen} screens={screens.length > 0 ? screens : [initialHeatmap.screen]} />
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <Card>
            <div className="heading" style={{ marginBottom: 10 }}>What this view shows</div>
            <p className="subtext" style={{ fontSize: "0.88rem", marginBottom: 14 }}>
              Every point represents normalized mobile tap coordinates aggregated to two decimal places on the backend.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Tag tone="accent">Blue = low density</Tag>
              <Tag tone="amber">Yellow = medium</Tag>
              <Tag tone="red">Red = high</Tag>
            </div>
            {!hasHeatmapData ? (
              <p className="subtext" style={{ fontSize: "0.82rem", marginTop: 14 }}>
                No tap data has been ingested yet. Once your SDK starts sending events, this view will populate automatically.
              </p>
            ) : null}
          </Card>

          <Card>
            <div className="heading" style={{ marginBottom: 10 }}>Data source</div>
            <div className="list-row">
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)" }}>Backend endpoint</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>/heatmap?screen=...</div>
              </div>
              <Tag>Live</Tag>
            </div>
            <div className="list-row">
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)" }}>Coordinate model</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Normalized x/y with raw screen bounds stored per tap.</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
