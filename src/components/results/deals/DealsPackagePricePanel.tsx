import { Check } from "lucide-react";
import { formatCurrency } from "@/lib/currency/formatCurrency";
import type { DealsPackageCandidate } from "@/lib/deals/dealsPackageCandidates";

type Props = { candidate: DealsPackageCandidate; headingId: string; selected: boolean; t: (key: string) => string; onSelect: () => void };
const interpolate = (value: string, values: Record<string, string | number>) => Object.entries(values).reduce((copy, [key, replacement]) => copy.replaceAll(`{{${key}}}`, String(replacement)), value);
const wholeCurrency = (amount: number, currency: string) => formatCurrency(amount, currency, { maximumFractionDigits: 0, minimumFractionDigits: 0 });

export function DealsPackagePricePanel({ candidate, headingId, selected, t, onSelect }: Props) {
  return <aside className="min-w-0 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-5 xl:self-start xl:rounded-xl xl:border xl:border-slate-200 xl:px-4">
    <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:grid-cols-[minmax(180px,0.75fr)_minmax(300px,1.15fr)_minmax(220px,0.85fr)] xl:block">
      <div className="min-w-0">
        <p id={`${headingId}-total-label`} className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("deals.results.package.estimatedTotal")}</p>
        <p aria-labelledby={`${headingId}-total-label`} className="mt-0.5 text-2xl font-extrabold text-[#004BB8]">{candidate.estimatedTotal === null ? t("deals.results.priceUnavailable") : wholeCurrency(candidate.estimatedTotal, candidate.displayCurrency)}</p>
        <p className="mt-1 text-xs text-slate-500">{interpolate(t("deals.results.package.providerCount"), { count: candidate.providerCount })}</p>
      </div>
      <dl className="space-y-2 border-t border-slate-200 pt-3 md:border-t-0 md:pt-0 xl:mt-3 xl:border-t xl:pt-3">{candidate.priceBreakdown.map(item => <div key={item.product} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs"><dt className="text-slate-600">{t(`deals.results.package.price.${item.product}`)}</dt><dd title={`${item.sourceAmount} ${item.sourceCurrency}`} className="min-w-0 text-right font-bold tabular-nums"><span className="whitespace-nowrap">{item.displayAmount === null ? t("deals.results.priceUnavailable") : wholeCurrency(item.displayAmount, candidate.displayCurrency)}</span><span className="block whitespace-nowrap font-normal text-slate-500">{t("deals.results.package.providerPrice")}: {wholeCurrency(item.sourceAmount, item.sourceCurrency)}</span></dd></div>)}</dl>
      <div className="md:col-span-2 lg:col-span-1 xl:mt-4">
        <button type="button" aria-pressed={selected} onClick={onSelect} className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${selected ? "bg-[#004BB8] text-white" : "border border-[#004BB8] bg-white text-[#004BB8] hover:bg-blue-50"}`}>{selected && <Check aria-hidden className="h-4 w-4" />}{t(selected ? "deals.results.package.selected" : "deals.results.package.choose")}</button>
        <p className="mt-2.5 text-[11px] leading-4 text-slate-500">{t("deals.results.package.disclosure")}</p>
      </div>
    </div>
  </aside>;
}
