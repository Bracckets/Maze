import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  CircleUserRound,
  DollarSign,
  Droplets,
  FileText,
  Flame,
  KeyRound,
  LayoutDashboard,
  PlugZap,
  ReceiptText,
  Settings2,
  Sparkles,
  TableProperties,
  TrendingUp,
} from "lucide-react";

type PollexAppIconName =
  | "dashboard"
  | "usage"
  | "heatmap"
  | "liquid"
  | "profile"
  | "settings"
  | "pricing"
  | "docs"
  | "chart"
  | "table"
  | "insight"
  | "connection"
  | "key"
  | "workspace";

type Props = {
  className?: string;
  icon: PollexAppIconName;
};

const ICONS: Record<PollexAppIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  usage: BarChart3,
  heatmap: Flame,
  liquid: Droplets,
  profile: CircleUserRound,
  settings: Settings2,
  pricing: DollarSign,
  docs: FileText,
  chart: TrendingUp,
  table: TableProperties,
  insight: Sparkles,
  connection: PlugZap,
  key: KeyRound,
  workspace: Building2,
};

export function PollexAppIcon({ className, icon }: Props) {
  const Icon = ICONS[icon];
  return <Icon aria-hidden="true" className={className} />;
}
