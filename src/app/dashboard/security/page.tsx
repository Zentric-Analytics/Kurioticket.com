import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { AccountDetailShell } from "@/components/dashboard/AccountDetailShell";
import { SecurityDashboardPage } from "@/components/dashboard/DashboardGrid";

export const metadata = {
  title: "Security settings",
};

export default function SecurityPage() {
  return (
    <>
      <AppHeader />
      <main className="bg-[#f3f7fc] pb-10 pt-0 sm:pb-14">
        <AccountDetailShell>
          <SecurityDashboardPage />
        </AccountDetailShell>
      </main>
      <Footer />
    </>
  );
}
