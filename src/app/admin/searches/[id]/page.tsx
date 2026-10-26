import { notFound } from "next/navigation";

import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { SearchWorkspaceBackLink } from "@/components/admin/SearchWorkspaceBackLink";
import { searchActivityReturnHref } from "@/lib/adminSearchActivityNavigation";
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
    <>
      <SearchWorkspaceBackLink href={searchActivityReturnHref(raw)} label="Search activity" />
      <AdminPageShell title="Search detail" description="Safe operational search record. Raw search JSON is intentionally excluded.">
      {result.status === "ok" ? (
        <div className="space-y-4">
          <AdminSectionCard className="p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="font-black text-slate-950">Search outcome</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Safe diagnostic summary derived from the recorded search and exactly correlated provider telemetry when available.</p>
              </div>
              <AdminStatusBadge tone={result.data.diagnostic.outcome === "SUCCESS" ? "good" : result.data.diagnostic.outcome === "FAILED" ? "bad" : "warn"}>
                {result.data.diagnostic.outcome.replaceAll("_", " ")}
              </AdminStatusBadge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Reason" value={result.data.diagnostic.reason} />
              <Field label="Reason code" value={result.data.diagnostic.reasonCode} />
              <Field label="Retryable" value={result.data.diagnostic.retryable === null ? "Unknown" : result.data.diagnostic.retryable ? "Yes" : "No"} />
              <Field label="Correlation" value={result.data.diagnostic.correlation === "exact" ? "Exact provider telemetry" : "Legacy / general fallback"} />
            </div>
            {result.data.diagnostic.providers.length ? (
              <div className="mt-4">
                <h3 className="text-sm font-black text-slate-950">Provider outcomes</h3>
                <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {result.data.diagnostic.providers.map((provider, index) => (
                    <div key={provider.provider + "-" + provider.observedAt + "-" + index} className="grid gap-2 p-3 md:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1.5fr)_auto] md:items-center">
                      <div>
                        <p className="font-black text-slate-950">{provider.provider}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(new Date(provider.observedAt))}</p>
                      </div>
                      <AdminStatusBadge tone={provider.status === "SUCCESS" ? "good" : provider.status === "FAILED" ? "bad" : "warn"}>{provider.status}</AdminStatusBadge>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{provider.reason}</p>
                        <p className="text-xs text-slate-500">{provider.reasonCode || "No failure code"}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-600">{provider.latencyMs === null ? "—" : provider.latencyMs + " ms"}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                Exact provider-level diagnostics were not recorded for this search. The summary above does not guess a provider cause.
              </p>
            )}
          </AdminSectionCard>

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
            <Field label="Stay dates" value={formatStayDates(result.data.checkIn, result.data.checkOut)} />
            <Field label="Providers" value={result.data.providers.length ? result.data.providers.join(", ") : "—"} />
            <Field label="Market / currency" value={(result.data.market || "—") + " / " + (result.data.currency || "—")} />
            <Field label="Latency" value={result.data.latencyMs !== null ? result.data.latencyMs + "ms" : "—"} />
            <Field label="Identity" value={result.data.identity.kind} />
            <Field label="User ID" value={result.data.identity.userId || "—"} />
            <Field label="Visitor ID" value={result.data.identity.visitorId || "—"} />
            <Field label="Environment" value={result.data.environment} />
          </div>
          </AdminSectionCard>
        </div>
      ) : (
        <AdminSectionCard className="p-5 text-sm text-slate-600">This search record is unavailable for the requested admin scope.</AdminSectionCard>
      )}
      </AdminPageShell>
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><div className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</div></div>;
}

function formatStayDates(checkIn: string | null, checkOut: string | null) {
  if (!checkIn) return "—";
  const format = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  };
  return format(checkIn) + (checkOut ? " → " + format(checkOut) : "");
}
