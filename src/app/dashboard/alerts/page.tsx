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
      <main className="flex-1 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.12),transparent_34%),linear-gradient(180deg,#f8fbfc_0%,#ffffff_48%,#f8fafc_100%)] pb-10 pt-24 sm:pt-28 lg:pt-28">
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
