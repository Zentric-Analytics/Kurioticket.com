import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { AccountDashboardFrame } from "@/components/dashboard/DashboardGrid";
import { TripsManagementPage } from "./TripsManagementPage";

export const metadata = {
  title: "Trips",
};

export default function TripsPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-gradient-to-b from-white via-white to-slate-50 pb-10 pt-24 sm:pt-28 lg:pt-28">
        <div className="page-shell min-w-0">
          <AccountDashboardFrame>
            <TripsManagementPage />
          </AccountDashboardFrame>
        </div>
      </main>
      <Footer />
    </>
  );
}
