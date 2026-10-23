import {
  AdminDataTable,
  AdminEmptyState,
  AdminLinkButton,
  AdminMetricCard,
  AdminPageShell,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { CmsScopeHardeningActions } from "@/components/admin/CmsScopeHardeningActions";
import { getCmsHealthOverview } from "@/services/cmsHardeningService";

export const metadata = { title: "CMS Health" };

export default async function AdminCmsHealthPage() {
  const overview = await getCmsHealthOverview();

  return (
    <AdminPageShell
      title="CMS Health"
      description="Production integrity, fallback policy, ordering and unpublished-change diagnostics for every active CMS scope."
      actions={<AdminLinkButton href="/admin/content">Back to content</AdminLinkButton>}
    >
      {!overview.available ? (
        <AdminEmptyState
          title="CMS health unavailable"
          message="CMS storage could not be verified, so integrity is not being reported as healthy."
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <AdminMetricCard label="Scopes" value={overview.totals.scopes} />
            <AdminMetricCard label="Healthy" value={overview.totals.healthy} tone="good" />
            <AdminMetricCard label="Needs attention" value={overview.totals.unhealthy} tone={overview.totals.unhealthy ? "warn" : "good"} />
            <AdminMetricCard label="Fallback retired" value={overview.totals.retiredFallback} />
            <AdminMetricCard label="Unpublished changes" value={overview.totals.unpublishedChanges} tone={overview.totals.unpublishedChanges ? "info" : undefined} />
          </div>

          {overview.scopes.length === 0 ? (
            <AdminEmptyState
              title="No CMS scopes"
              message="No CMS scope has been initialized yet."
            />
          ) : (
            <AdminDataTable
              columns={["Scope", "Health", "Integrity", "Fallback", "Draft changes", "Actions"]}
              rows={overview.scopes.map((entry) => {
                const integrity = entry.integrity;
                const issueCount =
                  integrity.invalidDrafts.length +
                  integrity.invalidPublished.length +
                  integrity.orphanPublished.length +
                  integrity.draftOrderCollisions.length +
                  integrity.publishedOrderCollisions.length;

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
          )}
        </div>
      )}
    </AdminPageShell>
  );
}
