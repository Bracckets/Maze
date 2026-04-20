import { PollexLanding } from "@/components/pollex-landing";
import { PollexLandingShell } from "@/components/pollex-landing-shell";
import { getCurrentUser } from "@/lib/service-gateway";

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const user = "user" in currentUser.data ? currentUser.data.user : null;

  return (
    <PollexLandingShell>
      <PollexLanding
        primaryHref={user ? "/dashboard" : "/signup"}
        demoHref={user ? "/heatmap" : "/docs"}
        bookDemoHref={user ? "/liquid" : "/docs"}
      />
    </PollexLandingShell>
  );
}
