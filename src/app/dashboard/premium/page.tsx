import { getServerSession } from "next-auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PremiumDashboardFoundation } from "@/components/dashboard/DashboardGrid";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Premium Dashboard",
};

export default async function PremiumDashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-dark">Intelligent Travel Optimization Membership</p>
            <h1 className="mt-1 text-3xl font-bold text-navy">Premium Dashboard</h1>
          </div>
          <LinkButton href="/pricing" variant="accent">Upgrade or Manage</LinkButton>
        </div>
        {!session?.user?.isPremium ? (
          <Card className="mt-5 border-teal/30 bg-teal/5 p-4 text-sm text-teal-dark">
            Premium tools are shown here as the Phase 1 foundation. Subscribe to unlock live premium access.
          </Card>
        ) : null}
        <div className="mt-6">
          <PremiumDashboardFoundation />
        </div>
      </main>
      <Footer />
    </>
  );
}
