import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Search Detail" };

export default async function AdminSearchDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const raw = await searchParams;
  const query = new URLSearchParams();
  const environment = typeof raw.environment === "string" ? raw.environment : "";
  if (environment) query.set("environment", environment);
  const result = await adminOperationalReads.searches.detail(id, query);
  if (result.status === "not_found") notFound();

  return (
    <AdminPageShell title="Search detail" description="Safe operational search record. Raw search JSON is intentionally excluded." actions={<Link href="/admin/searches" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Back to searches</Link>}>
      {result.status === "ok" ? (
        <AdminSectionCard className="p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Search ID" value={result.data.id} />
            <Field label="Request ID" value={result.data.requestId || "—"} />
            <Field label="Created" value={formatDateTime(new Date(result.data.createdAt))} />
            <Field label="Product" value={result.data.product} />
            <Field label="Status" value={<AdminStatusBadge tone={result.data.status === "SUCCESS" ? "good" : result.data.status === "FAILED" ? "bad" : "warn"}>{result.data.status}</AdminStatusBadge>} />
            <Field label="Results" value={String(result.data.resultCount)} />
            <Field label="Origin" value={result.data.origin || "—"} />
            <Field label="Destination" value={result.data.destination || "—"} />
            <Field label="Stay dates" value={result.data.checkIn ? result.data.checkIn + (result.data.checkOut ? " → " + result.data.checkOut : "") : "—"} />
            <Field label="Providers" value={result.data.providers.length ? result.data.providers.join(", ") : "—"} />
            <Field label="Market / currency" value={(result.data.market || "—") + " / " + (result.data.currency || "—")} />
            <Field label="Latency" value={result.data.latencyMs !== null ? result.data.latencyMs + "ms" : "—"} />
            <Field label="Identity" value={result.data.identity.kind} />
            <Field label="User ID" value={result.data.identity.userId || "—"} />
            <Field label="Visitor ID" value={result.data.identity.visitorId || "—"} />
            <Field label="Environment" value={result.data.environment} />
          </div>
        </AdminSectionCard>
      ) : (
        <AdminSectionCard className="p-5 text-sm text-slate-600">This search record is unavailable for the requested admin scope.</AdminSectionCard>
      )}
    </AdminPageShell>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><div className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</div></div>;
}
