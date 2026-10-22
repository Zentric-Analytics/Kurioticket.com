import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Provider Handoff Detail" };

export default async function AdminHandoffDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const raw = await searchParams;
  const query = new URLSearchParams();
  const environment = typeof raw.environment === "string" ? raw.environment : "";
  if (environment) query.set("environment", environment);
  const result = await adminOperationalReads.handoffs.detail(id, query);
  if (result.status === "not_found") notFound();

  return (
    <AdminPageShell title="Provider handoff detail" description="Recorded outbound provider handoff. This is not a booking confirmation." actions={<Link href="/admin/redirects" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Back to handoffs</Link>}>
      {result.status === "ok" ? (
        <AdminSectionCard className="p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Handoff ID" value={result.data.id} />
            <Field label="Created" value={formatDateTime(new Date(result.data.createdAt))} />
            <Field label="Product" value={result.data.product} />
            <Field label="Provider" value={result.data.provider} />
            <Field label="Route" value={result.data.route || "—"} />
            <Field label="Price" value={result.data.price ? result.data.currency + " " + result.data.price : "—"} />
            <Field label="Source page" value={result.data.sourcePage || "—"} />
            <Field label="Destination domain" value={result.data.destinationDomain || "—"} />
            <Field label="Search correlation" value={<AdminStatusBadge tone={result.data.searchCorrelation.kind === "exact" ? "good" : "neutral"}>{result.data.searchCorrelation.kind === "exact" ? "Exact" : "Unavailable"}</AdminStatusBadge>} />
            <Field label="Search history ID" value={result.data.searchCorrelation.searchHistoryId || "—"} />
            <Field label="Identity" value={result.data.identity.kind} />
            <Field label="User ID" value={result.data.identity.userId || "—"} />
            <Field label="Visitor ID" value={result.data.identity.visitorId || "—"} />
            <Field label="Environment" value={result.data.environment} />
          </div>
        </AdminSectionCard>
      ) : (
        <AdminSectionCard className="p-5 text-sm text-slate-600">This provider handoff is unavailable for the requested admin scope.</AdminSectionCard>
      )}
    </AdminPageShell>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><div className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</div></div>;
}
