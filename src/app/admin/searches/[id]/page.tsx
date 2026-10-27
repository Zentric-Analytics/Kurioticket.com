import { ChevronDown } from "lucide-react";
import { notFound } from "next/navigation";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
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
          <div className="border-y border-[#D7DCE3] py-8 text-[12px] text-[#6B7280]">
            This search record is unavailable for the requested admin scope.
          </div>
        )}
      </AdminPageShell>
    </>
  );
}

function SearchDetailContent({ search }: { search: AdminSearchDetail }) {
  const diagnostic = search.diagnostic;
  const providerReasonCodes = diagnostic.providers
    .filter(provider => provider.reasonCode)
    .map(provider => provider.provider + ": " + provider.reasonCode);

  return (
    <div className="mx-auto w-full max-w-[1500px] text-[#374151]">
      <section className="border-b border-[#D7DCE3] px-2 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-[#111827]">Search overview</h2>
            <p className="mt-2 text-[16px] font-semibold tracking-tight text-[#111827]">
              {searchDetailHeadline(search)}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#6B7280]">
              {searchDetailProductLabel(search.product)} search · {formatDateTime(new Date(search.createdAt))}
            </p>
          </div>
          <StatusDot status={diagnostic.outcome === "ZERO_RESULTS" ? "ZERO_RESULTS" : search.status} label={searchDetailOutcomeLabel(diagnostic.outcome)} />
        </div>
        <div className="mt-4 grid grid-cols-2 border-t border-[#D7DCE3] pt-3 sm:grid-cols-3">
          <Metric label="Results found" value={search.resultCount.toLocaleString()} />
          <Metric label="Duration" value={searchDetailDuration(search.latencyMs)} />
          <Metric label="Providers" value={search.providerTelemetry ? String(search.providerTelemetry.total) : "—"} />
        </div>
      </section>

      <section className="border-b border-[#D7DCE3] px-2 py-5">
        <h2 className="text-[13px] font-semibold text-[#111827]">Search information</h2>
        <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 lg:grid-cols-3">
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
      </section>

      <section className="border-b border-[#D7DCE3] px-2 py-5">
        <h2 className="text-[13px] font-semibold text-[#111827]">Provider outcomes</h2>
        {diagnostic.providers.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[740px] border-collapse text-left text-[12px]">
              <thead><tr className="border-b border-[#D7DCE3] text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
                <th className="px-2 py-3 font-semibold">Provider</th>
                <th className="px-2 py-3 font-semibold">Status</th>
                <th className="px-2 py-3 font-semibold">Reason</th>
                <th className="px-2 py-3 text-right font-semibold">Duration</th>
              </tr></thead>
              <tbody>
                {diagnostic.providers.map((provider, index) => (
                  <tr key={provider.provider + "-" + provider.observedAt + "-" + index} className="border-b border-[#E5E7EB] text-[#374151] last:border-b-0">
                    <td className="px-2 py-3 align-top">
                      <p className="font-semibold text-[#111827]">{provider.provider}</p>
                      <p className="mt-0.5 text-[10px] text-[#9CA3AF]">{formatDateTime(new Date(provider.observedAt))}</p>
                    </td>
                    <td className="px-2 py-3 align-top"><StatusDot status={provider.status} /></td>
                    <td className="px-2 py-3 align-top">{provider.reason}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right align-top">{searchDetailDuration(provider.latencyMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-[12px] leading-5 text-[#6B7280]">
            No exact provider execution records are available for this search. A provider cause cannot be confirmed.
          </p>
        )}
      </section>

      {diagnostic.outcome !== "SUCCESS" ? (
        <section className="border-b border-[#D7DCE3] px-2 py-5">
          <h2 className="text-[13px] font-semibold text-[#111827]">Search diagnosis</h2>
          <p className="mt-2 text-[12px] leading-5 text-[#374151]">{diagnostic.reason}</p>
          <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
            <Field
              label="Retryable"
              value={diagnostic.retryable === null ? "Unknown" : diagnostic.retryable ? "Yes" : "No"}
            />
            <Field
              label="Provider evidence"
              value={diagnostic.correlation === "exact" ? "Exact provider records available" : "Exact provider records unavailable"}
            />
          </div>
        </section>
      ) : null}

      <section className="border-b border-[#D7DCE3] px-2 py-5">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 [&::-webkit-details-marker]:hidden">
            <h2 className="text-[13px] font-semibold text-[#111827]">Technical details</h2>
            <ChevronDown size={17} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-[#D7DCE3] pt-4 lg:grid-cols-3">
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
      </section>
    </div>
  );
}

function StatusDot({ status, label }: { status: "SUCCESS" | "PARTIAL" | "FAILED" | "DEGRADED" | "DISABLED" | "ZERO_RESULTS"; label?: string }) {
  const state = {
    SUCCESS: { label: "Complete", dot: "bg-emerald-500", text: "text-emerald-700" },
    PARTIAL: { label: "Partial", dot: "bg-amber-400", text: "text-amber-700" },
    FAILED: { label: "Failed", dot: "bg-rose-500", text: "text-rose-700" },
    DEGRADED: { label: "Degraded", dot: "bg-amber-400", text: "text-amber-700" },
    DISABLED: { label: "Disabled", dot: "bg-slate-400", text: "text-slate-600" },
    ZERO_RESULTS: { label: "No results", dot: "bg-amber-400", text: "text-amber-700" },
  }[status];
  return <span className={"inline-flex items-center gap-1.5 text-[12px] font-semibold " + state.text}>
    <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + state.dot} />
    {label ?? state.label}
  </span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-[#6B7280]">{label}</p>
      <p className="mt-1 break-words text-[22px] font-medium tabular-nums text-[#111827]">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 border-b border-[#E5E7EB] py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">{label}</p>
      <div className="mt-1 break-words text-[12px] font-semibold text-[#111827]">{value}</div>
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
