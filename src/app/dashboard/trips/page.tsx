import { AppHeader } from "@/components/layout/AppHeader";
import { AccountBackLink } from "@/components/dashboard/AccountBackLink";
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
        <div className="page-shell min-w-0">
          <AccountBackLink />
          <TripsManagementPage />
        </div>
      </main>
      <Footer />
    </>
  );
}
