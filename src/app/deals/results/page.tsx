import { cookies } from "next/headers";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { DealsResultsClient } from "@/components/results/DealsResultsClient";
import { parseDealsSearchParams, validateDealsSearch } from "@/lib/deals/dealsSearchParams";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export async function generateMetadata() { const t = getTranslations((await cookies()).get(LOCALE_COOKIE_KEY)?.value); return { title: t["deals.results.title"], description: t["deals.results.explanation"] }; }
export default async function DealsResultsPage({ searchParams }: { searchParams: SearchParams }) {
  const search = parseDealsSearchParams(await searchParams); const invalid = Object.keys(validateDealsSearch(search)).length > 0;
  return <><AppHeader flushDesktopBottom hideDesktopTravelNav /><DealsResultsClient initialSearch={search} invalid={invalid} /><Footer /></>;
}
