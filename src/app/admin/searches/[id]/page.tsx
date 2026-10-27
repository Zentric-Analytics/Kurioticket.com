import { ChevronDown } from "lucide-react";
import { notFound } from "next/navigation";

import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { SearchWorkspaceBackLink } from "@/components/admin/SearchWorkspaceBackLink";
import { searchActivityReturnHref } from "@/lib/adminSearchActivityNavigation";
import {
  searchDetailDuration,
  searchDetailHeadline,
  searchDetailIdentityLabel,
  searchDetailOutcomeLabel,
  searchDetailProductLabel,
} from "@/lib/adminSearchDetailPresentation";
import { formatDateTime } from "@/lib/admin-data";
import type { AdminSearchDetail } from "@/services/adminOperationalReadContract";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Search Detail" };

export default async function AdminSearchDetailPage({
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
  const result = await adminOperationalReads.searches.detail(id, query);
  if (result.status === "not_found") notFound();

  return (
    <>
      <SearchWorkspaceBackLink href={searchActivityReturnHref(raw)} label="Search activity" />
      <AdminPageShell title="Search detail" hideHeader>
        {result.status === "ok" ? (
          <SearchDetailContent search={result.data} />
        ) : (
          <AdminSectionCard className="p-5 text-sm text-slate-600">
            This search record is unavailable for the requested admin scope.
          </AdminSectionCard>
        )}
      </AdminPageShell>
    </>
  );
}

function SearchDetailContent({ search }: { search: AdminSearchDetail }) {
  const diagnostic = search.diagnostic;
  const outcomeTone = diagnostic.outcome === "SUCCESS" ? "good" : diagnostic.outcome === "FAILED" ? "bad" : "warn";
  const providerReasonCodes = diagnostic.providers
    .filter(provider => provider.reasonCode)
    .map(provider => provider.provider + ": " + provider.reasonCode);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <AdminSectionCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-950">Search overview</h2>
            <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
              {searchDetailHeadline(search)}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {searchDetailProductLabel(search.product)} search · {formatDateTime(new Date(search.createdAt))}
            </p>
          </div>
          <AdminStatusBadge tone={outcomeTone}>{searchDetailOutcomeLabel(diagnostic.outcome)}</AdminStatusBadge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-slate-200 pt-4 sm:grid-cols-3">
          <Metric label="Results found" value={search.resultCount.toLocaleString()} />
          <Metric label="Duration" value={searchDetailDuration(search.latencyMs)} />
          <Metric label="Providers" value={search.providerTelemetry ? String(search.providerTelemetry.total) : "—"} />
        </div>
      </AdminSectionCard>

      <AdminSectionCard className="p-4 sm:p-5">
        <h2 className="text-sm font-bold text-slate-950">Search information</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Product" value={searchDetailProductLabel(search.product)} />
          {search.origin ? <Field label={search.product === "CAR" ? "Pickup location" : "Origin"} value={search.origin} /> : null}
          {search.destination ? <Field label={search.product === "CAR" ? "Drop-off location" : "Destination"} value={search.destination} /> : null}
          {search.checkIn || search.checkOut ? (
            <Field
              label={search.product === "HOTEL" ? "Stay dates" : search.product === "CAR" ? "Rental dates" : "Travel dates"}
              value={formatTravelDates(search.checkIn, search.checkOut)}
            />
          ) : null}
          {search.market ? <Field label="Market" value={search.market} /> : null}
          {search.currency ? <Field label="Currency" value={search.currency} /> : null}
          <Field label="Identity" value={searchDetailIdentityLabel(search.identity.kind)} />
        </div>
      </AdminSectionCard>

      <AdminSectionCard className="p-4 sm:p-5">
        <h2 className="text-sm font-bold text-slate-950">Provider outcomes</h2>
        {diagnostic.providers.length ? (
          <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {diagnostic.providers.map((provider, index) => (
              <div
                key={provider.provider + "-" + provider.observedAt + "-" + index}
                className="grid min-w-0 gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.25fr)_auto] md:items-center"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-slate-950">{provider.provider}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(new Date(provider.observedAt))}</p>
                </div>
                <div>
                  <AdminStatusBadge tone={provider.status === "SUCCESS" ? "good" : provider.status === "FAILED" ? "bad" : "warn"}>
                    {provider.status === "SUCCESS" ? "Complete" : provider.status === "DEGRADED" ? "Degraded" : provider.status === "DISABLED" ? "Disabled" : "Failed"}
                  </AdminStatusBadge>
                </div>
                <p className="break-words text-sm text-slate-700">{provider.reason}</p>
                <p className="whitespace-nowrap text-xs font-semibold text-slate-600">
                  {provider.latencyMs === null ? "—" : provider.latencyMs + " ms"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-600">
            No exact provider execution records are available for this search. A provider cause cannot be confirmed.
          </p>
        )}
      </AdminSectionCard>

      {diagnostic.outcome !== "SUCCESS" ? (
        <AdminSectionCard className="p-4 sm:p-5">
          <h2 className="text-sm font-bold text-slate-950">Search diagnosis</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{diagnostic.reason}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field
              label="Retryable"
              value={diagnostic.retryable === null ? "Unknown" : diagnostic.retryable ? "Yes" : "No"}
            />
            <Field
              label="Provider evidence"
              value={diagnostic.correlation === "exact" ? "Exact provider records available" : "Exact provider records unavailable"}
            />
          </div>
        </AdminSectionCard>
      ) : null}

      <AdminSectionCard className="p-4 sm:p-5">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 [&::-webkit-details-marker]:hidden">
            <h2 className="text-sm font-bold text-slate-950">Technical details</h2>
            <ChevronDown size={17} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Search ID" value={search.id} />
            {search.requestId ? <Field label="Request ID" value={search.requestId} /> : null}
            <Field label="Recorded status" value={search.status} />
            <Field label="Reason code" value={diagnostic.reasonCode} />
            <Field
              label="Correlation"
              value={diagnostic.correlation === "exact" ? "Exact provider telemetry" : "Legacy / general fallback"}
            />
            <Field label="Environment" value={search.environment} />
            {search.identity.userId ? <Field label="User ID" value={search.identity.userId} /> : null}
            {search.identity.visitorId ? <Field label="Visitor ID" value={search.identity.visitorId} /> : null}
            {providerReasonCodes.length ? <Field label="Provider reason codes" value={providerReasonCodes.join("; ")} /> : null}
          </div>
        </details>
      </AdminSectionCard>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words text-xl font-semibold tabular-nums text-slate-950">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function formatTravelDates(checkIn: string | null, checkOut: string | null) {
  const format = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  };
  return [checkIn, checkOut].filter((date): date is string => Boolean(date)).map(format).join(" → ");
}
