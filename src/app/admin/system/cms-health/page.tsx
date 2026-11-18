import { CmsRetryButton } from "@/components/admin/CmsRetryButton";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { CmsScopeHealthRow } from "@/components/admin/CmsScopeHealthRow";
import { getCmsMarketName } from "@/lib/adminCmsMarketLabels";
import { getCmsHealthOverview } from "@/services/cmsHardeningService";
import { getAdminCmsHotelOptions, getCmsHomepageFlightRoutePairs } from "@/services/cmsContentService";
import { homepageCmsMarkets } from "@/services/homepageCmsService";

export const metadata = { title: "CMS Health" };

const cmsHealthGroups = [
  { id: "homepage-destinations", label: "Homepage destinations", type: "HOMEPAGE_DESTINATION" },
  { id: "flight-routes", label: "Flight routes", type: "FLIGHT_ROUTE" },
  { id: "hotel-destinations", label: "Hotel destinations", type: "HOTEL_DESTINATION" },
  { id: "faqs", label: "FAQs", type: "FAQ" },
] as const;

const tableHeadingClass = "px-3 py-3 text-left text-[12px] font-medium uppercase text-[#475569]";

const cmsLocaleDisplayNames =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "language" })
    : null;

function getCmsLocaleName(locale: string) {
  try {
    return cmsLocaleDisplayNames?.of(locale) ?? locale;
  } catch {
    return locale;
  }
}

export default async function AdminCmsHealthPage() {
  const overview = await getCmsHealthOverview();
  const cmsHealthHotelOptions = overview.available ? await getAdminCmsHotelOptions().catch(() => null) : [];

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1500px] bg-white text-[#020617]">
      <AdminPageShell title="CMS Health" hideHeader><header className="border-b border-[#D8E1EC] pb-4 pt-1"><h1 className="text-[20px] font-semibold leading-7 tracking-[-0.02em] text-[#020617]">CMS Health</h1></header>
        {!overview.available ? (
          <section className="border-y border-[#D8E1EC] py-5" aria-labelledby="cms-health-unavailable">
            <h2 id="cms-health-unavailable" className="text-[15px] font-semibold text-[#020617]">
              CMS health unavailable
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-[#475569]">
              CMS storage could not be verified, so integrity is not being reported as healthy.
            </p>
          </section>
        ) : (
          <div className="min-w-0">
          {cmsHealthHotelOptions === null ? <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 text-[13px] text-rose-700">Hotel destination choices could not be loaded. <CmsRetryButton /></div> : null}
          <section aria-label="CMS health summary" className="w-full min-w-0">
            <div role="region" tabIndex={0} aria-label="CMS health metrics" className="w-full min-w-0 overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
              <dl className="grid min-w-0 grid-cols-2 gap-px border-y border-[#D8E1EC] bg-[#E7ECF5] sm:grid-cols-4">
                {[
                  { label: "Healthy", value: overview.totals.healthy, dot: "bg-emerald-500" },
                  { label: "Needs attention", value: overview.totals.unhealthy, dot: overview.totals.unhealthy ? "bg-amber-500" : "bg-emerald-500" },
                  { label: "Fallback retired", value: overview.totals.retiredFallback, dot: "bg-slate-400" },
                  { label: "Total scopes", value: overview.totals.scopes, dot: "bg-[#004BB8]" },
                ].map((metric) => (
                  <div key={metric.label} className="min-w-0 bg-white px-4 py-4">
                    <dt className="flex min-w-0 items-center gap-2 text-[12px] font-medium text-[#64748B]">
                      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${metric.dot}`} />
                      {metric.label}
                    </dt>
                    <dd className="mt-2 text-[22px] font-semibold leading-7 tabular-nums text-[#020617]">{metric.value.toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {overview.missingHomepageScopes.length > 0 ? (
            <section
              aria-labelledby="missing-homepage-scopes-heading"
              className="border-b border-[#D8E1EC] py-5"
            >
              <h2 id="missing-homepage-scopes-heading" className="text-[15px] font-semibold text-[#020617]">
                Missing homepage CMS scopes ({overview.missingHomepageScopes.length})
              </h2>
              <p className="mt-1 max-w-4xl text-[13px] leading-5 text-[#475569]">
                These supported markets have no CMS scope. Existing scopes can still be healthy.
                Review setup before changing any content; do not rerun the full initialization against existing records.
              </p>
              <ul className="mt-3 grid gap-2 text-[12px] sm:grid-cols-2 xl:grid-cols-3">
                {overview.missingHomepageScopes.map((scope) => (
                  <li
                    key={`${scope.type}:${scope.market}:${scope.locale}`}
                    className="border-l-[3px] border-amber-500 py-1 pl-3 text-[#475569]"
                  >
                    <span className="font-semibold text-[#020617]">{scope.type.replaceAll("_", " ")}</span>
                    <span className="ml-2">{scope.market} · {scope.locale}</span>
                    <span className="ml-2 font-medium text-amber-700">Not initialized</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {overview.scopes.length === 0 ? (
            <section className="border-b border-[#D8E1EC] py-5" aria-labelledby="no-cms-scopes">
              <h2 id="no-cms-scopes" className="text-[15px] font-semibold text-[#020617]">No CMS scopes</h2>
              <p className="mt-1 text-[13px] leading-5 text-[#475569]">
                No CMS scope has been initialized yet.
              </p>
            </section>
          ) : (
            <section aria-label="CMS area diagnostics" className="border-b border-[#D8E1EC] pb-6 pt-5">
              <div className="border-y border-[#D8E1EC]">
                {cmsHealthGroups.map((group) => {
                  const entries = overview.scopes.filter((entry) => entry.type === group.type);
                  if (entries.length === 0) return null;

                  const needsAttention = entries.filter((entry) => !entry.integrity.healthy).length;
                  const healthy = entries.length - needsAttention;
                  const fallbackRetired = entries.filter((entry) => entry.integrity.legacyFallbackRetired).length;

                  return (
                    <details
                      key={group.id}
                      className="group border-b border-[#E7ECF5] last:border-b-0"
                      open={needsAttention > 0}
                    >
                      <summary className="grid cursor-pointer list-none grid-cols-1 gap-3 py-4 marker:content-none sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#020617]">{group.label}</p>
                          <p className="mt-0.5 text-[12px] text-[#64748B]">
                            {entries.length} scope{entries.length === 1 ? "" : "s"} · {healthy} healthy · {needsAttention} need{needsAttention === 1 ? "s" : ""} attention
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 sm:justify-end">
                          <CmsStatusIndicator
                            label={needsAttention ? `${needsAttention} need attention` : "Healthy"}
                            tone={needsAttention ? "warn" : "good"}
                          />
                          <span className="text-[12px] text-[#64748B]">
                            {fallbackRetired} fallback retired
                          </span>
                          <span aria-hidden="true" className="text-[14px] leading-none text-[#64748B] transition-transform group-open:rotate-180">⌄</span>
                        </div>
                      </summary>

                      <div className="border-t border-[#E7ECF5]">
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-0 table-fixed text-left text-[13px]">
                            <colgroup>
                              <col className="w-[24%]" />
                              <col className="w-[14%]" />
                              <col className="w-[28%]" />
                              <col className="w-[17%]" />
                              <col className="w-[17%]" />
                            </colgroup>
                            <thead className="border-b border-[#D8E1EC]">
                              <tr>
                                <th scope="col" className={tableHeadingClass}>CMS market</th>
                                <th scope="col" className={tableHeadingClass}>Health</th>
                                <th scope="col" className={tableHeadingClass}>Integrity</th>
                                <th scope="col" className={tableHeadingClass}>Legacy fallback</th>
                                <th scope="col" className={tableHeadingClass}>Draft changes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E7ECF5]">
                              {entries.map((entry) => (
                                <CmsScopeHealthRow
                                  key={`${entry.type}:${entry.market}:${entry.locale}`}
                                  type={entry.type}
                                  market={entry.market}
                                  locale={entry.locale}
                                  marketName={getCmsMarketName(entry.market)}
                                  localeName={getCmsLocaleName(entry.locale)}
                                  integrity={entry.integrity}
                                  markets={homepageCmsMarkets}
                                  hotelOptions={cmsHealthHotelOptions ?? []}
                                  supportedFlightRoutes={
                                    group.type === "HOMEPAGE_DESTINATION" || group.type === "FLIGHT_ROUTE"
                                      ? getCmsHomepageFlightRoutePairs(group.type)
                                      : []
                                  }
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          )}
          </div>
        )}
      </AdminPageShell>
    </div>
  );
}

function CmsStatusIndicator({ label, tone }: { label: string; tone: "good" | "warn" }) {
  const text = tone === "good" ? "text-emerald-700" : "text-amber-700";
  const dot = tone === "good" ? "bg-emerald-500" : "bg-amber-500";

  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${text}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
