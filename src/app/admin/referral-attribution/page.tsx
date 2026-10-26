import { AdminButton, AdminDataTable, AdminEmptyState, AdminFilterBar, AdminMetricCard, AdminPageShell, AdminSelect, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { SearchWorkspaceBackLink } from "@/components/admin/SearchWorkspaceBackLink";
import { requireAdminApiSession } from "@/lib/admin";
import { currentReferralAttributionEnvironment, getReferralAttributionSummary, parseAttributionDays } from "@/services/referralAttributionService";

export const metadata = { title: "Admin Referral Attribution" };

export default async function AdminReferralAttributionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireAdminApiSession();
  if (auth.response) {
    return <><SearchWorkspaceBackLink /><AdminPageShell title="Referral Attribution" description="ADMIN-only provider handoff attribution."><AdminEmptyState title="Admin access required" message="Referral attribution is restricted to configured ADMIN accounts." /></AdminPageShell></>;
  }

  const raw = await searchParams;
  const daysValue = typeof raw.days === "string" ? raw.days : null;
  const days = parseAttributionDays(daysValue);
  if (days === null) {
    return <><SearchWorkspaceBackLink /><AdminPageShell title="Referral Attribution" description="ADMIN-only provider handoff attribution."><AdminEmptyState title="Invalid date window" message="Choose a reporting window from 1 to 90 days." /></AdminPageShell></>;
  }

  const environment = currentReferralAttributionEnvironment();
  const summary = await getReferralAttributionSummary(days, environment);

  return (
    <>
      <SearchWorkspaceBackLink />
      <AdminPageShell
        title="Referral Attribution"
        description="Measure verified provider handoffs by provider and source page. These figures describe outbound referrals only; they do not claim bookings, payments or revenue."
      >
      <div className="space-y-4">
        <AdminFilterBar action="/admin/referral-attribution">
          <AdminSelect name="days" defaultValue={String(days)}>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </AdminSelect>
          <AdminButton type="submit">Update window</AdminButton>
        </AdminFilterBar>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label="Provider handoffs" value={summary.handoffs.total} hint={summary.window.days + "-day " + summary.environment + " window"} tone="info" />
          <AdminMetricCard label="Linked to search" value={summary.handoffs.linkedToSearch} hint="Explicit search correlation" tone="good" />
          <AdminMetricCard label="Not linked to search" value={summary.handoffs.notLinkedToSearch} hint="No exact search correlation" tone="neutral" />
          <AdminMetricCard label="Data state" value={summary.dataAvailable ? "Available" : "Unavailable"} hint="Unavailable is not treated as zero" tone={summary.dataAvailable ? "good" : "warn"} />
        </div>

        {!summary.dataAvailable ? (
          <AdminEmptyState title="Attribution data unavailable" message="The referral reader could not verify attribution data for this window. No zero-performance claim is being made." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-lg font-black text-slate-950">Handoffs by provider</h2>
              {summary.providers.length ? (
                <AdminDataTable
                  columns={["Provider", "Product", "Handoffs"]}
                  rows={summary.providers.map((item) => ({
                    id: item.provider + "-" + item.product,
                    cells: [
                      <span key="provider" className="font-semibold text-slate-950">{item.provider}</span>,
                      <AdminStatusBadge key="product" tone="info">{item.product}</AdminStatusBadge>,
                      item.handoffs,
                    ],
                  }))}
                />
              ) : <AdminEmptyState title="No provider handoffs" message="No provider handoffs were recorded in this reporting window." />}
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-black text-slate-950">Handoffs by source page</h2>
              {summary.sourcePages.length ? (
                <AdminDataTable
                  columns={["Source page", "Handoffs"]}
                  rows={summary.sourcePages.map((item) => ({
                    id: item.sourcePage,
                    cells: [<span key="source" className="font-semibold text-slate-950">{item.sourcePage}</span>, item.handoffs],
                  }))}
                />
              ) : <AdminEmptyState title="No source-page attribution" message="No source-page handoffs were recorded in this reporting window." />}
            </div>
          </div>
        )}
      </div>
      </AdminPageShell>
    </>
  );
}
