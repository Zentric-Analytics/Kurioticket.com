import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SupportDashboardPage } from "@/components/dashboard/DashboardGrid";

export const metadata = {
  title: "Support",
};

export default function SupportPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-white pb-10 pt-0 sm:pt-5 lg:pt-5">
        <div className="page-shell min-w-0">
          <SupportDashboardPage />
        </div>
      </main>
      <Footer />
    </>
  );
}
