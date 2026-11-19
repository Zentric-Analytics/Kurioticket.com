import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { applicationLabel, platformOptions, searchInvestigationHref } from "@/lib/platformHealthPresentation";
import type { readPlatformSearchActivity } from "@/services/platformOperationsService";

export function PlatformOverviewSummary({ data }: {
  data: Awaited<ReturnType<typeof readPlatformSearchActivity>>;
}) {
  const { searches, window } = data;

  return (
    <section aria-labelledby="platform-overview-title" className="h-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="platform-overview-title" className="text-sm font-semibold text-slate-950">Platform Search Activity</h2>
        <Link href={searchInvestigationHref(window, "ALL")} prefetch={false}
          className="focus-ring inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
          aria-label="View Platform Search Activity details">
          View details <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {searches ? (
        <div role="region" aria-label="Platform search activity by application" tabIndex={0}
          className="mt-3 w-full min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
          <dl className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 min-[90rem]:grid-cols-5">
            {platformOptions.map(option => (
              <div key={option.value} className="flex min-h-[72px] min-w-0 flex-col justify-center rounded-lg bg-slate-50 p-3">
                <dt>
                  <Link href={searchInvestigationHref(window, option.value)} prefetch={false}
                    className="focus-ring inline-block max-w-full break-words rounded text-xs font-medium text-slate-600 hover:text-[#004BB8]">
                    {applicationLabel(option.value)}
                  </Link>
                </dt>
                <dd className="mt-1 text-lg font-semibold leading-6 tabular-nums text-slate-950">
                  {(option.value === "ALL" ? searches.combined : searches.applications[option.value]).total.toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p role="status" className="mt-4 text-sm text-slate-600">
          Platform activity monitoring is unavailable. No platform totals are shown.
        </p>
      )}
    </section>
  );
}
