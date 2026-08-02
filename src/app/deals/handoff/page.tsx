import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { DealsHandoffClient } from "@/components/results/deals/DealsHandoffClient";

export default function DealsHandoffPage() {
  return <>
    <AppHeader flushDesktopBottom hideDesktopTravelNav />
    <main className="flex-1 bg-surface-muted/40">
      <section className="border-b border-border bg-white">
        <div className="page-shell max-w-5xl py-7 sm:py-10">
          <DealsHandoffClient />
        </div>
      </section>
    </main>
    <Footer />
  </>;
}
