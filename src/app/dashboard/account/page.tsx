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
      <main className="flex-1 bg-slate-50 pb-16 lg:pb-20">
        <AccountMenuPage />
      </main>
      <Footer />
    </>
  );
}
