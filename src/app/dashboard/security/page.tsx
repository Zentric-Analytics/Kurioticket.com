import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SecurityDashboardPage } from "@/components/dashboard/DashboardGrid";

export const metadata = {
  title: "Security settings",
};

export default function SecurityPage() {
  return (
    <>
      <AppHeader showAccountBackLink />
      <main className="flex-1 bg-[#f3f7fc] pb-10 pt-0">
        <SecurityDashboardPage />
      </main>
      <Footer />
    </>
  );
}
