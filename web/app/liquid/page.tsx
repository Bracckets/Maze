import Link from "next/link";

import { LiquidStudio } from "@/components/liquid-studio";
import { DashboardShell } from "@/components/site-shell";
import { getSessionScreens } from "@/lib/site-data";
import {
  getLiquidIntegrationStatus,
  getLiquidKeyDetail,
  getLiquidKeys,
  getLiquidProfiles,
  getLiquidTraits,
  type LiquidKeyDetail,
} from "@/lib/service-gateway";

export default async function LiquidPage() {
  const [keys, profiles, traits, observedScreens, integrationStatus] = await Promise.all([
    getLiquidKeys(),
    getLiquidProfiles(),
    getLiquidTraits(),
    getSessionScreens(),
    getLiquidIntegrationStatus(),
  ]);
  const keyDetails = (await Promise.all(keys.map((key) => getLiquidKeyDetail(key.id)))).filter(
    (item): item is LiquidKeyDetail => Boolean(item),
  );

  return (
    <DashboardShell
      title="Liquid engine"
      subtitle="Define fallback copy, map it to observed screens, stage changes, and monitor how Liquid variants perform."
      headerAction={
        <Link className="btn btn-ghost btn-sm" href="/docs#liquid-workflow">
          How to use
        </Link>
      }
    >
      <LiquidStudio
        initialKeys={keys}
        initialKeyDetails={keyDetails}
        initialProfiles={profiles}
        initialTraits={traits}
        observedScreens={observedScreens}
        initialIntegrationStatus={integrationStatus}
      />
    </DashboardShell>
  );
}
