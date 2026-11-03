import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Provider Handoff Detail" };

export default async function AdminHandoffDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const query = new URLSearchParams();
  const environment = typeof raw.environment === "string" ? raw.environment : "";
  if (environment) query.set("environment", environment);
  const result = await adminOperationalReads.handoffs.detail(id, query);
  if (result.status === "not_found") notFound();

  const backHref = "/admin/redirects" + (environment
    ? "?environment=" + encodeURIComponent(environment) : "");

  return (
    <section className="w-full min-w-0 bg-white text-[#0F172A]">
      <h1 className="sr-only">Provider handoff detail</h1>
      <div className="border-b border-[#D8E1EC] pb-3">
        <Link href={backHref}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-[#475569] hover:text-[#004BB8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          Back to handoffs
        </Link>
      </div>
      {result.status === "ok" ? (
        <div className="divide-y divide-[#D8E1EC]">
          <section aria-labelledby="handoff-identity" className="py-4">
            <h2 id="handoff-identity" className="text-[15px] font-semibold">Identity &amp; correlation</h2>
            <dl className="mt-3 grid min-w-0 gap-x-5 gap-y-3 md:grid-cols-3">
              <Field label="Identity" value={result.data.identity.kind} />
              <Field label="Search correlation"
                value={<span className={result.data.searchCorrelation.kind === "exact"
                  ? "font-medium text-emerald-700" : "text-[#64748B]"}>
                  {result.data.searchCorrelation.kind === "exact" ? "Exact" : "Unavailable"}
                </span>} />
              <Field label="User ID" value={result.data.identity.userId || "—"} />
              <Field label="Handoff ID" value={result.data.id} />
              <Field label="Search history ID" value={result.data.searchCorrelation.searchHistoryId || "—"} />
              <Field label="Visitor ID" value={result.data.identity.visitorId || "—"} />
            </dl>
          </section>
          <section aria-labelledby="handoff-overview" className="py-4">
            <h2 id="handoff-overview" className="text-[15px] font-semibold">Handoff overview</h2>
            <dl className="mt-3 grid min-w-0 gap-x-5 gap-y-3 md:grid-cols-3">
              <Field label="Provider" value={result.data.provider} />
              <Field label="Product" value={result.data.product} />
              <Field label="Price" value={result.data.price
                ? result.data.currency + " " + result.data.price : "—"} />
              <Field label={result.data.product.toUpperCase() === "HOTEL" ? "Property" : "Route"} value={result.data.route || "—"} />
              <Field label="Created" value={formatDateTime(new Date(result.data.createdAt))} />
            </dl>
          </section>
          <section aria-labelledby="handoff-referral" className="py-4">
            <h2 id="handoff-referral" className="text-[15px] font-semibold">Referral information</h2>
            <dl className="mt-3 grid min-w-0 gap-x-5 gap-y-3 md:grid-cols-3">
              <Field label="Source page" value={result.data.sourcePage || "—"} />
              <Field label="Destination domain" value={result.data.destinationDomain || "—"} />
              <Field label="Environment" value={result.data.environment} />
            </dl>
            <p className="mt-3 text-[12px] leading-5 text-[#64748B]">
              Outbound referral recorded; booking and payment are not confirmed.
            </p>
          </section>
        </div>
      ) : (
        <div className="py-5">
          <AdminEmptyState title="Provider handoff unavailable"
            message="This provider handoff is unavailable for the requested admin scope." />
        </div>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-normal text-[#64748B]">{label}</dt>
      <dd className="mt-1 select-text break-words text-[13px] font-medium leading-5 text-[#0F172A] [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
