import {
  AdminDataTable,
  AdminEmptyState,
  AdminPageShell,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { CmsScopeHardeningActions } from "@/components/admin/CmsScopeHardeningActions";
import { getCmsMarketName } from "@/lib/adminCmsMarketLabels";
import { getCmsHealthOverview } from "@/services/cmsHardeningService";

export const metadata = { title: "CMS Health" };

const cmsHealthGroups = [
  { id: "homepage-destinations", label: "Homepage destinations", type: "HOMEPAGE_DESTINATION" },
  { id: "flight-routes", label: "Flight routes", type: "FLIGHT_ROUTE" },
  { id: "hotel-destinations", label: "Hotel destinations", type: "HOTEL_DESTINATION" },
  { id: "faqs", label: "FAQs", type: "FAQ" },
] as const;

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

  return (
    <AdminPageShell title="CMS Health" eyebrow="">
      {!overview.available ? (
        <AdminEmptyState
          title="CMS health unavailable"
          message="CMS storage could not be verified, so integrity is not being reported as healthy."
        />
      ) : (
        <div className="space-y-5">
          <section aria-label="CMS health summary" className="max-w-[720px] border-y border-[#D8E1EC]">
            <div className="divide-y divide-[#E7ECF5]">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 py-3">
                <p className="flex items-center gap-2 text-[13px] font-medium text-emerald-700">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Healthy
                </p>
                <p className="text-[14px] font-semibold tabular-nums text-[#020617]">{overview.totals.healthy}</p>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 py-3">
                <p className={`flex items-center gap-2 text-[13px] font-medium ${overview.totals.unhealthy ? "text-amber-700" : "text-emerald-700"}`}>
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${overview.totals.unhealthy ? "bg-amber-500" : "bg-emerald-500"}`}
                  />
                  Needs attention
                </p>
                <p className="text-[14px] font-semibold tabular-nums text-[#020617]">{overview.totals.unhealthy}</p>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 py-3">
                <p className="flex items-center gap-2 text-[13px] font-medium text-[#475569]">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Fallback retired
                </p>
                <p className="text-[14px] font-semibold tabular-nums text-[#020617]">{overview.totals.retiredFallback}</p>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 py-3">
                <p className="text-[13px] font-medium text-[#475569]">Total records</p>
                <p className="text-[14px] font-semibold tabular-nums text-[#020617]">{overview.totals.scopes}</p>
              </div>
            </div>
          </section>

          {overview.missingHomepageScopes.length > 0 ? (
            <section aria-labelledby="missing-homepage-scopes-heading" className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <h2 id="missing-homepage-scopes-heading" className="text-sm font-semibold text-slate-900">
                Missing homepage CMS scopes ({overview.missingHomepageScopes.length})
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                These supported markets have no CMS scope. Existing scopes can still be healthy.
                Review setup before changing any content; do not rerun the full initialization against existing records.
              </p>
              <ul className="mt-3 grid gap-1.5 text-xs text-slate-700 sm:grid-cols-2 xl:grid-cols-3">
                {overview.missingHomepageScopes.map((scope) => (
                  <li key={`${scope.type}:${scope.market}:${scope.locale}`} className="rounded-md border border-amber-200 bg-white px-3 py-2">
                    <span className="font-semibold">{scope.type.replaceAll("_", " ")}</span>
                    <span className="ml-2 text-slate-600">{scope.market} · {scope.locale}</span>
                    <span className="ml-2 font-medium text-amber-800">Not initialized</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {overview.scopes.length === 0 ? (
            <AdminEmptyState
              title="No CMS scopes"
              message="No CMS scope has been initialized yet."
            />
          ) : (
            <section aria-labelledby="cms-areas-heading">
              <div className="mb-2">
                <h2 id="cms-areas-heading" className="text-[15px] font-semibold text-[#020617]">CMS areas</h2>
                <p className="mt-1 text-[12px] text-[#64748B]">
                  Expand an area to review individual records and diagnostics.
                </p>
              </div>

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
                      <summary className="flex cursor-pointer list-none flex-col gap-3 px-3 py-3.5 marker:content-none sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#020617]">{group.label}</p>
                          <p className="mt-1 text-[12px] text-[#64748B]">
                            {entries.length} record{entries.length === 1 ? "" : "s"} · {healthy} healthy · {needsAttention} need{needsAttention === 1 ? "s" : ""} attention
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
                          <AdminStatusBadge tone={needsAttention ? "warn" : "good"}>
                            {needsAttention ? `${needsAttention} need attention` : "Healthy"}
                          </AdminStatusBadge>
                          <span className="text-[12px] text-[#64748B]">
                            {fallbackRetired} fallback retired
                          </span>
                          <span aria-hidden="true" className="text-[16px] leading-none text-[#64748B] transition-transform group-open:rotate-180">⌄</span>
                        </div>
                      </summary>

                      <div className="border-t border-[#E7ECF5] px-3 pb-4 pt-3">
                        <AdminDataTable
                          columns={["CMS market", "Health", "Integrity", "Fallback", "Draft changes", "Actions"]}
                          rows={entries.map((entry) => {
                            const integrity = entry.integrity;
                            const issueCount =
                              integrity.invalidDrafts.length +
                              integrity.invalidPublished.length +
                              integrity.orphanPublished.length +
                              integrity.draftOrderCollisions.length +
                              integrity.publishedOrderCollisions.length +
                              (integrity.draftOrderNeedsNormalization ? 1 : 0);

                            return {
                              id: `${entry.type}:${entry.market}:${entry.locale}`,
                              cells: [
                                <div key="scope">
                                  <p className="font-semibold text-slate-950">{getCmsMarketName(entry.market)}</p>
                                  <p className="mt-1 text-xs text-slate-600">{getCmsLocaleName(entry.locale)}</p>
                                  <p className="mt-1 text-[11px] text-slate-400">
                                    {entry.market} · {entry.locale} · v{integrity.scopeVersion ?? "—"}
                                  </p>
                                </div>,
                                <AdminStatusBadge key="health" tone={integrity.healthy ? "good" : "warn"}>
                                  {integrity.healthy ? "Healthy" : "Needs attention"}
                                </AdminStatusBadge>,
                                <div key="integrity" className="text-xs leading-5 text-slate-600">
                                  <p>{issueCount} issue{issueCount === 1 ? "" : "s"}</p>
                                  <p>{integrity.invalidDrafts.length} invalid draft</p>
                                  <p>{integrity.invalidPublished.length} invalid published</p>
                                  <p>{integrity.draftOrderCollisions.length} draft order collision</p>
                                  <p>{integrity.draftOrderNeedsNormalization ? "Draft order needs normalization" : "Draft order normalized"}</p>
                                  <p>{integrity.publishedOrderCollisions.length} published order collision</p>
                                </div>,
                                <AdminStatusBadge key="fallback" tone={integrity.legacyFallbackRetired ? "neutral" : "info"}>
                                  {integrity.legacyFallbackRetired ? "Retired" : "Available"}
                                </AdminStatusBadge>,
                                integrity.unpublishedChanges,
                                integrity.scopeVersion ? (
                                  <CmsScopeHardeningActions
                                    key="actions"
                                    type={entry.type}
                                    market={entry.market}
                                    locale={entry.locale}
                                    scopeVersion={integrity.scopeVersion}
                                    legacyFallbackRetired={integrity.legacyFallbackRetired}
                                    fallbackRetirementEligible={integrity.fallbackRetirementEligible}
                                    draftOrderCollisionCount={integrity.draftOrderCollisions.length}
                                    draftOrderNeedsNormalization={integrity.draftOrderNeedsNormalization}
                                  />
                                ) : "—",
                              ],
                            };
                          })}
                        />
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
  );
}
