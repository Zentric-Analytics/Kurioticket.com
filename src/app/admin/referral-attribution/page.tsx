import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { ReferralWindowFilter } from "@/components/admin/ReferralWindowFilter";
import { SearchWorkspaceBackLink } from "@/components/admin/SearchWorkspaceBackLink";
import { requireAdminApiSession } from "@/lib/admin";
import {
  currentReferralAttributionEnvironment,
  getReferralAttributionSummary,
  parseAttributionDays,
} from "@/services/referralAttributionService";

export const metadata = { title: "Admin Referral Attribution" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminReferralAttributionPage({
  searchParams,
  embedded = false,
}: { embedded?: boolean; searchParams: SearchParams }) {
  const auth = await requireAdminApiSession();
  if (auth.response) {
    return <section className="min-w-0 bg-white py-4">
      {!embedded ? <SearchWorkspaceBackLink href="/admin/providers" label="Providers" /> : null}
      <AdminEmptyState title="Admin access required"
        message="Referral attribution is restricted to configured ADMIN accounts." />
    </section>;
  }

  const raw = await searchParams;
  const daysValue = typeof raw.days === "string" ? raw.days : null;
  const days = parseAttributionDays(daysValue);
  if (days === null) {
    return <section className="min-w-0 bg-white py-4">
      {!embedded ? <SearchWorkspaceBackLink href="/admin/providers" label="Providers" /> : null}
      <AdminEmptyState title="Invalid date window"
        message="Choose a reporting window from 1 to 90 days." />
    </section>;
  }

  const environment = currentReferralAttributionEnvironment();
  const summary = await getReferralAttributionSummary(days, environment);

  return (
    <section aria-label="Referral Attribution" className="w-full min-w-0 bg-white text-[#0F172A]">
      {!embedded ? (
        <div className="mb-4">
          <SearchWorkspaceBackLink href="/admin/providers" label="Providers" />
          <h1 className="text-[18px] font-semibold">Referral Attribution</h1>
        </div>
      ) : <h1 className="sr-only">Referral Attribution</h1>}

      {!embedded ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-[#D8E1EC] pb-2">
          <ReferralWindowFilter days={days} embedded={false} />
          <span className="text-[12px] text-[#64748B]">
            {summary.environment === "production" ? "Production" : "Staging"}
          </span>
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-y-4 border-b border-[#D8E1EC] py-5 xl:grid-cols-4">
        <div className="min-w-0 px-3 first:pl-0 xl:border-r xl:border-[#E7ECF5]">
          <dt className="text-[12px] text-[#64748B]">Provider handoffs</dt>
          <dd className="mt-1 text-[20px] font-semibold tabular-nums">
            {summary.dataAvailable ? summary.handoffs.total.toLocaleString() : "—"}
          </dd>
        </div>
        <div className="min-w-0 px-3 xl:border-r xl:border-[#E7ECF5]">
          <dt className="text-[12px] text-[#64748B]">Linked to search</dt>
          <dd className="mt-1 text-[20px] font-semibold tabular-nums">
            {summary.dataAvailable ? summary.handoffs.linkedToSearch.toLocaleString() : "—"}
          </dd>
        </div>
        <div className="min-w-0 px-3 xl:border-r xl:border-[#E7ECF5]">
          <dt className="text-[12px] text-[#64748B]">Not linked to search</dt>
          <dd className="mt-1 text-[20px] font-semibold tabular-nums">
            {summary.dataAvailable ? summary.handoffs.notLinkedToSearch.toLocaleString() : "—"}
          </dd>
        </div>
        <div className="min-w-0 px-3 last:pr-0">
          <dt className="text-[12px] text-[#64748B]">Data state</dt>
          <dd className={"mt-1 text-[15px] font-medium " +
            (summary.dataAvailable ? "text-emerald-700" : "text-amber-700")}>
            {summary.dataAvailable ? "Available" : "Unavailable"}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-[12px] leading-5 text-[#64748B]">
        Handoffs record outbound provider referrals, not confirmed bookings or payments.
        Unlinked handoffs have no verified search correlation.
      </p>

      {!summary.dataAvailable ? (
        <div className="py-5">
          <AdminEmptyState title="Attribution data unavailable"
            message="The referral reader could not verify attribution data for this window. No zero-performance claim is being made." />
        </div>
      ) : (
        <div className="mt-6 grid min-w-0 gap-x-8 gap-y-7 xl:grid-cols-2">
          <section aria-labelledby="handoffs-by-provider" className="min-w-0">
            <h2 id="handoffs-by-provider" className="mb-2 text-[15px] font-semibold">
              Handoffs by provider
            </h2>
            {summary.providers.length ? (
              <table className="w-full table-fixed text-[13px]">
                <caption className="sr-only">Provider handoffs by product in the selected window</caption>
                <colgroup>
                  <col className="w-[52%]" />
                  <col className="w-[25%]" />
                  <col className="w-[23%]" />
                </colgroup>
                <thead className="border-y border-[#D8E1EC] text-[12px] text-[#475569]">
                  <tr>
                    <th scope="col" className="py-2.5 pr-3 text-left font-medium">Provider</th>
                    <th scope="col" className="px-2 py-2.5 text-left font-medium">Product</th>
                    <th scope="col" className="py-2.5 pl-2 text-right font-medium">Handoffs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7ECF5]">
                  {summary.providers.map(item => (
                    <tr key={item.provider + "-" + item.product}>
                      <th scope="row" className="break-words py-3 pr-3 text-left font-medium">{item.provider}</th>
                      <td className="px-2 py-3 text-[#475569]">{item.product}</td>
                      <td className="py-3 pl-2 text-right tabular-nums">{item.handoffs.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <AdminEmptyState title="No provider handoffs"
              message="No provider handoffs were recorded in this reporting window." />}
          </section>

          <section aria-labelledby="handoffs-by-source" className="min-w-0">
            <h2 id="handoffs-by-source" className="mb-2 text-[15px] font-semibold">
              Handoffs by source page
            </h2>
            {summary.sourcePages.length ? (
              <table className="w-full table-fixed text-[13px]">
                <caption className="sr-only">Provider handoffs by source page in the selected window</caption>
                <colgroup>
                  <col className="w-[77%]" />
                  <col className="w-[23%]" />
                </colgroup>
                <thead className="border-y border-[#D8E1EC] text-[12px] text-[#475569]">
                  <tr>
                    <th scope="col" className="py-2.5 pr-3 text-left font-medium">Source page</th>
                    <th scope="col" className="py-2.5 pl-3 text-right font-medium">Handoffs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7ECF5]">
                  {summary.sourcePages.map(item => (
                    <tr key={item.sourcePage}>
                      <th scope="row" className="break-all py-3 pr-3 text-left font-medium">{item.sourcePage}</th>
                      <td className="py-3 pl-3 text-right tabular-nums">{item.handoffs.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <AdminEmptyState title="No source-page attribution"
              message="No source-page handoffs were recorded in this reporting window." />}
          </section>
        </div>
      )}
    </section>
  );
}
