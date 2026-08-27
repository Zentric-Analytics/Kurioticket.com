import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function FlightDetailsLoadingShell({ resultsHref }: { resultsHref?: string }) {
  return (
    <main className="flex-1 bg-white pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.75rem+env(safe-area-inset-top))] sm:bg-[#F7F9FC] sm:py-7 lg:pt-7">
      <div className="mx-auto w-full max-w-[1500px] px-0 sm:px-6 lg:px-8">
        {resultsHref ? (
          <Link href={resultsHref} className="ml-4 inline-flex items-center gap-2 text-sm font-semibold text-[#075EE8] sm:ml-0">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to results
          </Link>
        ) : null}
        <div role="status" aria-label="Loading flight details" className={`${resultsHref ? "mt-4" : ""} grid gap-5 lg:grid-cols-[minmax(0,2.45fr)_minmax(310px,0.95fr)] lg:gap-7`}>
          <span className="sr-only">Loading flight details</span>
          <div className="border-y border-slate-200 bg-white p-4 sm:rounded-[15px] sm:border sm:p-6">
            <div className="h-7 w-2/5 animate-pulse rounded bg-slate-200" />
            <div className="mt-5 h-56 animate-pulse rounded-[10px] bg-slate-100" />
            <div className="mt-7 h-6 w-36 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-40 w-[min(78vw,275px)] max-w-[275px] animate-pulse rounded-[10px] bg-slate-100" />
            <div className="mt-6 h-44 animate-pulse rounded-[10px] bg-slate-100" />
          </div>
          <div className="hidden h-[620px] animate-pulse rounded-[15px] border border-slate-200 bg-white lg:block" />
        </div>
      </div>
    </main>
  );
}
