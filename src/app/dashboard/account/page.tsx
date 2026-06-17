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
      <main className="flex-1 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.10),transparent_34%),radial-gradient(circle_at_15%_18%,rgba(59,130,246,0.08),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#ffffff_55%)] pb-16 pt-4 sm:pt-6 lg:pb-20 lg:pt-8">
        <div className="page-shell min-w-0">
          <AccountMenuPage />
        </div>
      </main>
      <Footer />
    </>
  );
}
