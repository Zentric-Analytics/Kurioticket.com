import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { AccountDashboardFrame, SavedDashboardPage } from "@/components/dashboard/DashboardGrid";

export const metadata = {
  title: "Saved",
};

export default function SavedPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.12),transparent_34%),linear-gradient(180deg,#f8fbfc_0%,#ffffff_48%,#f8fafc_100%)] pb-10 pt-0 sm:pt-5 lg:pt-5">
        <div className="page-shell min-w-0">
          <AccountDashboardFrame mobileOverviewTabs>
            <SavedDashboardPage />
          </AccountDashboardFrame>
        </div>
      </main>
      <Footer />
    </>
  );
}
