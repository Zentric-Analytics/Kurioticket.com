import Link from "next/link";

export function DealsReviewSummary({ modeLabel, count, totalLabel, disclosure, canContinue, continueHref, expiredNames, t }: { modeLabel: string; count: number; totalLabel: string | null; disclosure: string; canContinue: boolean; continueHref: string; expiredNames: string[]; t: (key: string) => string }) {
  const disabledId = "deals-review-continue-disabled";
  return <aside aria-labelledby="deals-review-summary-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24">
    <h2 id="deals-review-summary-title" className="text-xl font-extrabold text-slate-950">{t("deals.guided.review.estimatedTotal")}</h2>
    <dl className="mt-4 space-y-3 text-sm"><div><dt className="font-bold text-slate-500">Package</dt><dd className="mt-1 font-semibold text-slate-900">{modeLabel}</dd></div><div><dt className="font-bold text-slate-500">Included options</dt><dd className="mt-1 font-semibold text-slate-900">{count}</dd></div><div><dt className="font-bold text-slate-500">{t("deals.guided.review.estimatedTotal")}</dt><dd dir="ltr" className="mt-1 text-2xl font-extrabold tabular-nums text-slate-950">{totalLabel ?? t("deals.guided.review.totalUnavailable")}</dd></div></dl>
    <p className="mt-4 text-sm leading-6 text-slate-600">{disclosure}</p><p className="mt-2 text-sm leading-6 text-slate-600">{t("deals.guided.review.bookingDisclosure")}</p>
    {expiredNames.length > 0 && <p id={disabledId} className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{t("deals.guided.review.continueUnavailable")} {expiredNames.join(", ")}</p>}
    {canContinue ? <Link href={continueHref} className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#004BB8] px-4 py-2.5 text-center font-bold text-white">{t("deals.guided.review.continue")}</Link> : <button type="button" disabled aria-describedby={expiredNames.length ? disabledId : undefined} className="mt-5 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-300 px-4 py-2.5 text-center font-bold text-slate-600">{t("deals.guided.review.continue")}</button>}
  </aside>;
}
