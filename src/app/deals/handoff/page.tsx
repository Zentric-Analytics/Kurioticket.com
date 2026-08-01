import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { DealsHandoffClient } from "@/components/results/deals/DealsHandoffClient";

export default function DealsHandoffPage() {
  return <>
    <AppHeader flushDesktopBottom hideDesktopTravelNav />
    <main className="flex-1 bg-[#f6f8fb] py-7 sm:py-10">
      <div className="page-shell max-w-5xl">
        <DealsHandoffClient />
      </div>
    </main>
    <Footer />
  </>;
}
