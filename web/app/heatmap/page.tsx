import { DashboardShell } from "@/components/site-shell";
import { HeatmapViewer } from "@/components/heatmap-viewer";
import { Card, Tag } from "@/components/ui";
import { getRequestLocale } from "@/lib/i18n-server";
import { getHeatmap, getSessionScreens } from "@/lib/site-data";

export default async function HeatmapPage() {
  const locale = await getRequestLocale();
  const screens = await getSessionScreens();
  const initialScreen = screens[0] ?? "welcome";
  const initialHeatmap = await getHeatmap(initialScreen);
  const hasHeatmapData = initialHeatmap.points.length > 0 || screens.length > 0;

  return (
    <DashboardShell
      title={locale === "ar" ? "مستكشف الخريطة الحرارية" : "Heatmap explorer"}
      subtitle={locale === "ar" ? "افحص تجمعات النقرات، وسّع اللوحة، وصدّر صفوف المناطق الساخنة لرحلات الجوال والويب." : "Inspect clustered tap behavior, expand the canvas, and export hotspot rows for mobile and web workflows."}
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
            <p className="metric-label">{locale === "ar" ? "مقياس الألوان" : "Color scale"}</p>
            <p className="heading" style={{ marginBottom: 8 }}>{locale === "ar" ? "من كثافة منخفضة إلى عالية" : "Low to high density"}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Tag tone="accent">Blue</Tag>
              <Tag tone="amber">Yellow</Tag>
              <Tag tone="red">Red</Tag>
            </div>
          </Card>
          <Card className="kpi-panel">
            <p className="metric-label">{locale === "ar" ? "المصدر" : "Source"}</p>
            <p className="heading" style={{ marginBottom: 8 }}>/heatmap?screen=...</p>
            <p className="panel-copy">{locale === "ar" ? "إحداثيات نقرات مُطبّعة تُعاد مباشرة من الخلفية." : "Normalized tap coordinates returned directly from the backend."}</p>
          </Card>
          <Card className="kpi-panel">
            <p className="metric-label">{locale === "ar" ? "طبقة لقطة الشاشة" : "Screenshot overlay"}</p>
            <p className="heading" style={{ marginBottom: 8 }}>{locale === "ar" ? "أحدث لقطة ملتقطة" : "Latest captured frame"}</p>
            <p className="panel-copy">{locale === "ar" ? "يعرض المستكشف أحدث لقطة متاحة للشاشة المحددة." : "The explorer overlays the freshest screenshot available for the selected screen."}</p>
          </Card>
          <Card className="kpi-panel">
            <p className="metric-label">{locale === "ar" ? "حالة البيانات" : "Data status"}</p>
            <p className="heading" style={{ marginBottom: 8 }}>
              {hasHeatmapData ? (locale === "ar" ? "جاهزة للفحص" : "Ready for inspection") : (locale === "ar" ? "بانتظار بيانات النقر" : "Waiting for tap data")}
            </p>
            <p className="panel-copy">
              {hasHeatmapData
                ? locale === "ar" ? "وسّع العرض أو افحص صفوف المناطق الساخنة بشكل فردي." : "Expand the view or inspect individual hotspot rows."
                : locale === "ar" ? "بمجرد وصول حركة الحزمة، سيمتلئ هذا العرض تلقائياً." : "Once SDK traffic arrives, this view fills automatically."}
            </p>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
