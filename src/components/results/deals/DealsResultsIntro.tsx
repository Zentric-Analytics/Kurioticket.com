export function DealsResultsIntro({ t }: { t: (key: string) => string }) {
  return <header className="max-w-3xl pb-1">
    <h1 id="deals-trip-overview-heading" tabIndex={-1} className="text-2xl font-extrabold tracking-tight text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 sm:text-3xl">{t("deals.results.tripOptionsTitle")}</h1>
  </header>;
}
