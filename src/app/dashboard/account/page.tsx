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
      <main className="flex-1 bg-white pb-14 pt-5 sm:pt-7 lg:pb-18 lg:pt-14">
        <div className="page-shell min-w-0">
          <AccountMenuPage />
        </div>
      </main>
      <Footer />
    </>
  );
}
