import { cookies } from "next/headers";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { DealsHandoffClient } from "@/components/results/deals/DealsHandoffClient";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

export default async function DealsHandoffPage() {
  const t = getTranslations((await cookies()).get(LOCALE_COOKIE_KEY)?.value);

  return <>
    <AppHeader flushDesktopBottom hideDesktopTravelNav />
    <main className="flex-1 bg-[#f6f8fb] py-7 sm:py-10">
      <div className="page-shell max-w-5xl">
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#004BB8]">{t["deals.handoff.eyebrow"]}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{t["deals.handoff.title"]}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{t["deals.handoff.explanation"]}</p>
        </header>
        <DealsHandoffClient />
      </div>
    </main>
    <Footer />
  </>;
}
