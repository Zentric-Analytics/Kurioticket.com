import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { DealsResultsClient } from "@/components/results/DealsResultsClient";
import {
  getIncludedProducts,
  parseDealsSearchParams,
  validateDealsSearch,
} from "@/lib/deals/dealsSearchParams";
import { buildDealsSearchFingerprint } from "@/lib/deals/dealsTripPlan";
import { buildDealsPlanContextKey } from "@/lib/deals/dealsTripPlanStorage";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";
import {
  buildDealsJourneyUrl,
  getFirstDealsJourneyStage,
} from "@/lib/deals/dealsJourneyRoutes";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export async function generateMetadata() {
  const t = getTranslations((await cookies()).get(LOCALE_COOKIE_KEY)?.value);
  return {
    title: t["deals.results.breadcrumb.current"],
    description: t["deals.results.tripOptionsExplanation"],
  };
}
export default async function DealsResultsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const search = parseDealsSearchParams(params);
  const invalid = Object.keys(validateDealsSearch(search)).length > 0;
  if (!invalid)
    redirect(
      buildDealsJourneyUrl(getFirstDealsJourneyStage(search.mode), search),
    );
  const stagedRequested = params.journey === "staged";
  const scope =
    stagedRequested && getIncludedProducts(search.mode).hotel
      ? "guided"
      : "legacy";
  const contextKey = buildDealsPlanContextKey(
    scope,
    buildDealsSearchFingerprint(search),
  );
  return (
    <>
      <AppHeader flushDesktopBottom hideDesktopTravelNav />
      <DealsResultsClient
        key={contextKey}
        initialSearch={search}
        invalid={invalid}
        stagedRequested={stagedRequested}
      />
      <Footer />
    </>
  );
}
