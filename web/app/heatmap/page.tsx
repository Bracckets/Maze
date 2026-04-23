import { DashboardShell } from "@/components/site-shell";
import { HeatmapViewer } from "@/components/heatmap-viewer";
import { getRequestLocale } from "@/lib/i18n-server";
import { getSessionScreens } from "@/lib/site-data";

export default async function HeatmapPage() {
  const locale = await getRequestLocale();
  const screens = await getSessionScreens();
  const initialScreen = screens[0] ?? "welcome";

  return (
    <DashboardShell
      activePath="/heatmap"
      title={locale === "ar" ? "الخريطة الحرارية" : "Heatmap"}
      subtitle={
        locale === "ar"
          ? "اعرض كثافة النقرات ومناطق الضغط داخل شاشة واحدة هادئة ومباشرة."
          : "Inspect tap density, screenshot context, and hotspot ranking in a single focused surface."
      }
    >
      <HeatmapViewer
        initialScreen={initialScreen}
        screens={screens.length > 0 ? screens : [initialScreen]}
      />
    </DashboardShell>
  );
}
