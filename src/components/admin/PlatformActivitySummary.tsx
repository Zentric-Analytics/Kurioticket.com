import Link from "next/link";
import { AdminSectionCard } from "./AdminPageShell";
import { OperationalStatus } from "./OperationalStatus";
import { failureRate } from "@/lib/platformHealthPresentation";
import type { OperationalTotals } from "@/services/platformOperationsContract";
export function PlatformActivitySummary({ label, value, href, linkLabel }: {
    label: string;
    value: OperationalTotals | null;
    href: string;
    linkLabel: string;
}) {
    return <AdminSectionCard className="min-w-0 p-5">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold text-slate-950">{label}</h2><OperationalStatus state={value?.state ?? "MONITORING_UNAVAILABLE"}/></div>
  <p className="mt-5 text-3xl font-semibold tracking-tight tabular-nums text-slate-950">{value ? value.total.toLocaleString() : "Unavailable"}</p><p className="mt-1 text-xs text-slate-500">{value ? "Recorded operations · sample size" : "Telemetry could not be read"}</p>
  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4 text-xs">
   {[["Successful", value?.successful], ["Partial / degraded", value?.partial], ["Failed", value?.failed], ["Disabled", value?.disabled]].map(([title, count]) => <div key={title}><dt className="text-slate-500">{title}</dt><dd className="mt-1 font-semibold tabular-nums text-slate-900">{typeof count === "number" ? count.toLocaleString() : "Unavailable"}</dd></div>)}
   <div><dt className="text-slate-500">Failure rate</dt><dd className="mt-1 font-semibold">{value ? failureRate(value) : "Unavailable"}</dd></div><div><dt className="text-slate-500">Average latency</dt><dd className="mt-1 font-semibold">{value?.averageLatencyMs === null || value?.averageLatencyMs === undefined ? "Not measured" : value.averageLatencyMs.toLocaleString() + " ms"}</dd></div>
  </dl><p className="mt-3 text-[11px] leading-4 text-slate-500">Failure rate excludes disabled operations.</p>
  <Link href={href} className="focus-ring mt-4 inline-block rounded text-xs font-semibold text-[#004BB8] hover:underline">{linkLabel} →</Link>
 </AdminSectionCard>;
}
