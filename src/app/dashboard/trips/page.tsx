import { AppHeader } from "@/components/layout/AppHeader";
import { AccountDetailShell } from "@/components/dashboard/AccountDetailShell";
import { Footer } from "@/components/layout/Footer";
import { TripsManagementPage } from "./TripsManagementPage";

export const metadata = {
  title: "My Trips",
};

export default function TripsPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-white pb-10 pt-0 sm:pt-5 lg:pt-5">
        <AccountDetailShell>
          <TripsManagementPage />
        </AccountDetailShell>
      </main>
      <Footer />
    </>
  );
}
