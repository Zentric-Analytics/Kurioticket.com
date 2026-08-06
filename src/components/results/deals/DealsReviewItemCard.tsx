import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { DisplayPrice } from "@/lib/currency/formatCurrency";
import type { DealsReviewItem } from "@/lib/deals/dealsReviewPresentation";
import { useRouteProgress } from "@/components/layout/RouteProgress";

export function DealsReviewItemCard({ item, price, t }: { item: DealsReviewItem; price: DisplayPrice | null; t: (key: string) => string }) {
  const { start } = useRouteProgress();
  const converted = price?.isConvertedEstimate ? price : null;
  return <article aria-labelledby={`review-${item.product}-title`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><p className="text-sm font-bold uppercase tracking-wide text-[#004BB8]">{t(item.labelKey)}</p><h3 id={`review-${item.product}-title`} className="mt-1 break-words text-xl font-extrabold text-slate-950">{item.title}</h3><p className="mt-1 break-words text-slate-600">{item.subtitle}</p></div>
      {item.expired && <p className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-900"><AlertTriangle aria-hidden className="size-4" />{t("deals.guided.review.priceNeedsRefresh")}</p>}
    </div>
    <dl className="mt-5 grid gap-3 sm:grid-cols-2">
      <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("deals.guided.review.provider")}</dt><dd className="mt-1 break-words font-semibold text-slate-800">{item.provider}</dd></div>
      {item.details.map(detail => <div key={`${detail.labelKey}-${detail.value}`}><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{t(detail.labelKey)}</dt><dd dir={detail.dir} className="mt-1 break-words font-semibold text-slate-800">{detail.value}</dd></div>)}
    </dl>
    <div className="mt-5 rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("deals.guided.review.sourcePrice")}</p>
      <p dir="ltr" className="mt-1 whitespace-nowrap text-lg font-extrabold tabular-nums text-slate-950" aria-label={price?.providerFormatted ?? `${item.sourcePrice} ${item.sourceCurrency}`}>{price?.providerFormatted ?? `${item.sourcePrice} ${item.sourceCurrency}`}</p>
      {converted ? <p dir="ltr" className="mt-1 whitespace-nowrap text-sm font-bold tabular-nums text-slate-700" aria-label={converted.ariaLabel}>{t("deals.guided.review.estimatedPrice").replace("{{currency}}", converted.currency)}: {converted.formatted}</p> : price ? null : <p className="mt-1 text-sm text-slate-600">{t("deals.guided.review.conversionUnavailable")}</p>}
      {item.expired && <p className="mt-2 text-sm font-semibold text-amber-900">{t("deals.guided.review.expiredBody")}</p>}
    </div>
    <Link onClick={start} href={item.changeHref} className="focus-ring mt-5 inline-flex min-h-11 items-center rounded-xl border border-[#004BB8] px-4 py-2.5 font-bold text-[#004BB8]">{t(item.changeLabelKey)}<span className="sr-only">: {item.title}</span></Link>
  </article>;
}
