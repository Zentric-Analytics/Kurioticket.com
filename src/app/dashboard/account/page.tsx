import { AccountMenuPage } from "@/components/dashboard/DashboardGrid";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "My account",
};

export default function AccountPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-white pb-10 pt-6 sm:pt-8 lg:pt-28">
        <div className="page-shell min-w-0">
          <AccountMenuPage />
        </div>
      </main>
      <Footer />
    </>
  );
}
