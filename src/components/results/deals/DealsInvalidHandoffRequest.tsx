"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { translations as en } from "@/lib/i18n/en";

export function DealsInvalidHandoffRequest() {
  const { t: dictionary } = useLocale();
  const { start } = useRouteProgress();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  return <section data-deals-invalid-handoff-request aria-labelledby="deals-invalid-handoff-title" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <h1 id="deals-invalid-handoff-title" className="text-2xl font-extrabold text-slate-950">{t("deals.guided.handoffInvalid.title")}</h1>
    <p className="mt-3 max-w-2xl leading-7 text-slate-600">{t("deals.guided.handoffInvalid.body")}</p>
    <Link onClick={start} className="focus-ring mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#004BB8] px-5 py-2.5 font-bold text-white" href="/packages">{t("deals.guided.handoffInvalid.returnDeals")}</Link>
  </section>;
}
