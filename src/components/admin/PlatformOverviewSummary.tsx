import Link from "next/link";
import { applicationLabel, platformOptions, searchInvestigationHref } from "@/lib/platformHealthPresentation";
import type { readPlatformSearchActivity } from "@/services/platformOperationsService";

export function PlatformOverviewSummary({ data }: {
  data: Awaited<ReturnType<typeof readPlatformSearchActivity>>;
}) {
  const { searches, window } = data;

  return (
    <section aria-labelledby="platform-overview-title" className="mb-5 min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="platform-overview-title" className="text-sm font-semibold text-slate-950">Platform Search Activity</h2>
        <Link href={searchInvestigationHref(window, "ALL")} prefetch={false}
          className="focus-ring shrink-0 rounded text-sm font-semibold text-[#004BB8]">
          View Search Activity →
        </Link>
      </div>

      {searches ? (
        <div role="region" aria-label="Platform search activity by application" tabIndex={0}
          className="mt-4 w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
          <dl className="grid min-w-[700px] grid-cols-5 gap-3">
            {platformOptions.map(option => (
              <div key={option.value} className="flex min-h-[82px] min-w-0 flex-col justify-center rounded-lg bg-slate-50 p-3">
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
