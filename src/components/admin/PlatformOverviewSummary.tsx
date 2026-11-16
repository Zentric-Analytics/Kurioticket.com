import Link from "next/link";
import { applicationLabel, platformOptions } from "@/lib/platformHealthPresentation";
import type { PlatformOperations } from "./PlatformHealthDashboard";
export function PlatformOverviewSummary({ data, hours }: {
    data: PlatformOperations;
    hours: number;
}) {
    const searches = data.activity.data?.searches;
    return <section aria-labelledby="platform-overview-title" className="mb-5 min-w-0 rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="platform-overview-title" className="text-sm font-semibold text-slate-950">Platform operations</h2><p className="mt-1 text-xs text-slate-500">Recorded searches · last {hours} hours · {data.environment}. Separate from website presence and unique accounts.</p></div><Link href={"/admin/platform-health?hours=" + hours} className="focus-ring rounded text-sm font-semibold text-[#004BB8]">Open Platform Health →</Link></div>
  {searches ? <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{platformOptions.map(option => <div key={option.value} className="min-w-0 rounded-lg bg-slate-50 p-3"><dt><Link href={"/admin/platform-health?" + new URLSearchParams({ hours: String(hours), application: option.value })} className="focus-ring text-xs text-slate-600">{applicationLabel(option.value)}</Link></dt><dd className="mt-1 text-lg font-semibold tabular-nums text-slate-950">{(option.value === "ALL" ? searches.combined : searches.applications[option.value]).total.toLocaleString()}</dd></div>)}</dl> : <p role="status" className="mt-4 text-sm text-slate-600">Platform activity monitoring is unavailable. No platform totals are shown.</p>}
 </section>;
}
