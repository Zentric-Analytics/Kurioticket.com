import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { DealsHandoffClient } from "@/components/results/deals/DealsHandoffClient";
import { DealsGuidedHandoffClient } from "@/components/results/deals/DealsGuidedHandoffClient";
import { DealsInvalidHandoffRequest } from "@/components/results/deals/DealsInvalidHandoffRequest";
import { parseDealsHandoffRequestMode } from "@/lib/deals/dealsHandoffRequestMode";
import { parseDealsSearchParams } from "@/lib/deals/dealsSearchParams";
import { buildDealsSearchFingerprint } from "@/lib/deals/dealsTripPlan";

type Query = Record<string, string | string[] | undefined>;

export default async function DealsHandoffPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const mode = parseDealsHandoffRequestMode(query.journey);
  const search = parseDealsSearchParams(query);
  return <>
    <AppHeader flushDesktopBottom hideDesktopTravelNav />
    <main className="flex-1 bg-surface-muted/40">
      <section className="border-b border-border bg-white">
        <div className="page-shell max-w-5xl py-7 sm:py-10">
          {mode === "guided" ? <DealsGuidedHandoffClient key={buildDealsSearchFingerprint(search)} search={search} /> : mode === "legacy" ? <DealsHandoffClient /> : <DealsInvalidHandoffRequest />}
        </div>
      </section>
    </main>
    <Footer />
  </>;
}
