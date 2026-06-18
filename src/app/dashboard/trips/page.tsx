import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { TripsManagementPage } from "./TripsManagementPage";

export const metadata = {
  title: "My Trips",
};

export default function TripsPage() {
  return (
    <>
      <AppHeader showAccountBackLink />
      <main className="flex-1 bg-white pb-10 pt-0 sm:pt-5 lg:pt-5">
        <div className="page-shell min-w-0">
          <TripsManagementPage />
        </div>
      </main>
      <Footer />
    </>
  );
}
