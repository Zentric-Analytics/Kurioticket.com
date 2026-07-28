import { cookies } from "next/headers";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { DealsHandoffClient } from "@/components/results/deals/DealsHandoffClient";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

export default async function DealsHandoffPage() { const t = getTranslations((await cookies()).get(LOCALE_COOKIE_KEY)?.value); return <><AppHeader flushDesktopBottom hideDesktopTravelNav /><main className="flex-1 bg-slate-50 py-8"><div className="page-shell max-w-4xl"><h1 className="text-3xl font-extrabold">{t["deals.handoff.title"]}</h1><p className="mt-2 text-slate-600">{t["deals.handoff.explanation"]}</p><DealsHandoffClient /></div></main><Footer /></>; }
