export function DealsResultsIntro({ t }: { t: (key: string) => string }) {
  return <header className="max-w-3xl pb-1">
    <h1 id="deals-trip-overview-heading" tabIndex={-1} className="text-2xl font-extrabold tracking-tight text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 sm:text-3xl">{t("deals.results.tripOptionsTitle")}</h1>
    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">{t("deals.results.tripOptionsExplanation")}</p>
    <p className="mt-1 text-xs leading-5 text-slate-500"><span className="font-bold text-slate-700">{t("deals.results.trustSearch")}</span> {t("deals.results.trustProvider")}</p>
  </header>;
}
