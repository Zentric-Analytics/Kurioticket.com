import Link from "next/link";
import { OperationalStatus } from "./OperationalStatus";
import { failureRate } from "@/lib/platformHealthPresentation";
import type { OperationalTotals } from "@/services/platformOperationsContract";

export function PlatformActivitySummary({ label, value, href, linkLabel }: {
  label: string;
  value: OperationalTotals | null;
  href: string;
  linkLabel: string;
}) {
  return (
    <section aria-label={label + " summary"} className="min-w-0 bg-white px-4 py-4 lg:px-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-[#020617]">{label}</h3>
        <OperationalStatus state={value?.state ?? "MONITORING_UNAVAILABLE"} />
      </div>
      <p className="mt-3 break-words text-[22px] font-semibold leading-7 tabular-nums text-[#020617]">
        {value ? value.total.toLocaleString() : "Unavailable"}
      </p>
      <p className="mt-1 text-[11px] text-[#64748B]">
        {value ? "Recorded operations · sample size" : "Telemetry could not be read"}
      </p>
      <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-4 gap-y-2 border-t border-[#E7ECF5] pt-3 text-[12px]">
        {[
          ["Successful", value?.successful],
          ["Partial / degraded", value?.partial],
          ["Failed", value?.failed],
          ["Disabled", value?.disabled],
        ].map(([title, count]) => (
          <div key={title} className="min-w-0">
            <dt className="text-[#64748B]">{title}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-[#020617]">
              {typeof count === "number" ? count.toLocaleString() : "Unavailable"}
            </dd>
          </div>
        ))}
        <div className="min-w-0">
          <dt className="text-[#64748B]">Failure rate</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-[#020617]">{value ? failureRate(value) : "Unavailable"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[#64748B]">Average latency</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-[#020617]">
            {value?.averageLatencyMs === null || value?.averageLatencyMs === undefined
              ? "Not measured"
              : value.averageLatencyMs.toLocaleString() + " ms"}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] leading-4 text-[#64748B]">Failure rate excludes disabled operations.</p>
      <Link href={href} className="focus-ring mt-3 inline-block rounded-sm text-[12px] font-semibold text-[#004BB8] hover:underline">
        {linkLabel} →
      </Link>
    </section>
  );
}
