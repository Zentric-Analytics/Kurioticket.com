import { cookies } from "next/headers";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { AccountDetailShell } from "@/components/dashboard/AccountDetailShell";
import { SecurityDashboardPage } from "@/components/dashboard/DashboardGrid";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return { title: t["accountDashboard.security.title"] };
}

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
