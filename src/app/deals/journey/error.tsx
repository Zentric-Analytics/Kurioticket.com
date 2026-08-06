"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";

export default function DealsJourneyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLocale(); const { start } = useRouteProgress(); const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { void error.digest; heading.current?.focus(); }, [error]);
  return <section data-deals-guided-error className="page-shell max-w-3xl py-12">
    <div className="rounded-2xl border border-amber-300 bg-white p-6 shadow-sm sm:p-8">
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-extrabold outline-none">{t["deals.guided.error.title"]}</h1>
      <p className="mt-3 leading-7 text-slate-600">{t["deals.guided.error.body"]}</p>
      <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => reset()} className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-5 font-bold text-white">{t["deals.guided.error.retry"]}</button><Link href="/deals" onClick={start} className="focus-ring inline-flex min-h-11 items-center rounded-xl px-5 font-bold underline">{t["deals.guided.error.returnDeals"]}</Link></div>
    </div>
  </section>;
}
