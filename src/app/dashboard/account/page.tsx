import { MobileAccountMenuPage } from "@/components/dashboard/DashboardGrid";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "My account",
};

export default function AccountPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.12),transparent_30%),linear-gradient(180deg,#f7f3ff_0%,#ffffff_44%,#f3f6fb_100%)] pb-10 pt-6 sm:pt-8 lg:pt-28">
        <div className="page-shell min-w-0">
          <MobileAccountMenuPage />
        </div>
      </main>
      <Footer />
    </>
  );
}
