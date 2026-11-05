import {
  AdminDataTable,
  AdminEmptyState,
  AdminPageShell,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { CmsScopeHardeningActions } from "@/components/admin/CmsScopeHardeningActions";
import { getCmsHealthOverview } from "@/services/cmsHardeningService";

export const metadata = { title: "CMS Health" };

const cmsHealthGroups = [
  { id: "homepage-destinations", label: "Homepage destinations", type: "HOMEPAGE_DESTINATION" },
  { id: "flight-routes", label: "Flight routes", type: "FLIGHT_ROUTE" },
  { id: "hotel-destinations", label: "Hotel destinations", type: "HOTEL_DESTINATION" },
  { id: "faqs", label: "FAQs", type: "FAQ" },
] as const;

export default async function AdminCmsHealthPage() {
  const overview = await getCmsHealthOverview();

  return (
    <AdminPageShell
      title="CMS Health"
      description="Production integrity, fallback policy, ordering and unpublished-change diagnostics for every active CMS scope."
    >
      {!overview.available ? (
        <AdminEmptyState
          title="CMS health unavailable"
          message="CMS storage could not be verified, so integrity is not being reported as healthy."
        />
      ) : (
        <div className="space-y-5">
          <section aria-label="CMS health summary" className="border-b border-[#D8E1EC] pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                <div className="min-w-0">
                  <p className="text-[12px] text-[#64748B]">Healthy</p>
                  <p className="mt-1 text-[15px] font-semibold tabular-nums text-emerald-700">
                    {overview.totals.healthy}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] text-[#64748B]">Needs attention</p>
                  <p className={`mt-1 text-[15px] font-semibold tabular-nums ${overview.totals.unhealthy ? "text-amber-700" : "text-emerald-700"}`}>
                    {overview.totals.unhealthy}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] text-[#64748B]">Fallback active</p>
                  <p className={`mt-1 text-[15px] font-semibold tabular-nums ${overview.totals.scopes - overview.totals.retiredFallback > 0 ? "text-amber-700" : "text-[#020617]"}`}>
                    {overview.totals.scopes - overview.totals.retiredFallback}
                  </p>
                </div>
              </div>
              <p className="shrink-0 text-[12px] text-[#64748B]">
                Total records <span className="ml-1 font-medium tabular-nums text-[#334155]">{overview.totals.scopes}</span>
              </p>
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
                  const fallbackActive = entries.filter((entry) => !entry.integrity.legacyFallbackRetired).length;

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
                            {fallbackActive === 0
                              ? "Fallback retired"
                              : `${fallbackActive} fallback active`}
                          </span>
                          <span aria-hidden="true" className="text-[16px] leading-none text-[#64748B] transition-transform group-open:rotate-180">⌄</span>
                        </div>
                      </summary>

                      <div className="border-t border-[#E7ECF5] px-3 pb-4 pt-3">
                        <AdminDataTable
                          columns={["Scope", "Health", "Integrity", "Fallback", "Draft changes", "Actions"]}
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
                                  <p className="font-black text-slate-950">{entry.type}</p>
                                  <p className="text-xs text-slate-500">{entry.market} · {entry.locale}</p>
                                  <p className="mt-1 text-xs text-slate-400">Scope v{integrity.scopeVersion ?? "—"}</p>
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
