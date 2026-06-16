import { getServerSession } from "next-auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { AccountDashboardFrame } from "@/components/dashboard/DashboardGrid";
import { PriceAlertsContent } from "./PriceAlertsContent";
import { authOptions } from "@/lib/auth";
import {
  type AccountPriceAlert,
  listUserPriceAlerts,
} from "@/services/priceTrackingService";

export const metadata = {
  title: "Price Alerts",
};

export default async function AlertsPage() {
  const session = await getServerSession(authOptions);
  let alerts: AccountPriceAlert[] = [];
  let loadError = false;

  if (session?.user?.id) {
    try {
      alerts = await listUserPriceAlerts(session.user.id);
    } catch {
      loadError = true;
    }
  }

  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-white pb-10 pt-0 sm:pt-5 lg:pt-5">
        <div className="page-shell min-w-0">
          <AccountDashboardFrame>
            <PriceAlertsContent alerts={alerts} loadError={loadError} />
          </AccountDashboardFrame>
        </div>
      </main>
      <Footer />
    </>
  );
}
