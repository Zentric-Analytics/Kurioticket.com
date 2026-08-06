import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { DealsHandoffClient } from "@/components/results/deals/DealsHandoffClient";
import { DealsGuidedHandoffPending } from "@/components/results/deals/DealsGuidedHandoffPending";
import { DealsInvalidHandoffRequest } from "@/components/results/deals/DealsInvalidHandoffRequest";
import { parseDealsHandoffRequestMode } from "@/lib/deals/dealsHandoffRequestMode";
import { parseDealsSearchParams } from "@/lib/deals/dealsSearchParams";

type Query = Record<string, string | string[] | undefined>;

export default async function DealsHandoffPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const mode = parseDealsHandoffRequestMode(query.journey);
  return <>
    <AppHeader flushDesktopBottom hideDesktopTravelNav />
    <main className="flex-1 bg-surface-muted/40">
      <section className="border-b border-border bg-white">
        <div className="page-shell max-w-5xl py-7 sm:py-10">
          {mode === "guided" ? <DealsGuidedHandoffPending search={parseDealsSearchParams(query)} /> : mode === "legacy" ? <DealsHandoffClient /> : <DealsInvalidHandoffRequest />}
        </div>
      </section>
    </main>
    <Footer />
  </>;
}
