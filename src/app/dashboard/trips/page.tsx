import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { AccountDashboardFrame } from "@/components/dashboard/DashboardGrid";
import { TripsManagementPage } from "./TripsManagementPage";

export const metadata = {
  title: "My Trips",
};

export default function TripsPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.12),transparent_30%),linear-gradient(180deg,#f7f3ff_0%,#ffffff_44%,#f3f6fb_100%)] pb-10 pt-0 sm:pt-5 lg:pt-5">
        <div className="page-shell min-w-0">
          <AccountDashboardFrame mobileOverviewTabs mobileBackHref="/dashboard">
            <TripsManagementPage />
          </AccountDashboardFrame>
        </div>
      </main>
      <Footer />
    </>
  );
}
