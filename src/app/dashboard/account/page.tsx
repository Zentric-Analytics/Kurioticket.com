import { AccountMenuPage } from "@/components/dashboard/DashboardGrid";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "My Account",
};

export default function AccountPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-white pb-14 pt-6 sm:pt-8 lg:pb-18 lg:pt-12">
        <div className="page-shell min-w-0">
          <AccountMenuPage />
        </div>
      </main>
      <Footer />
    </>
  );
}
