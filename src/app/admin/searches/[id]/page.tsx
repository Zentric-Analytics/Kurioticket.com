import { SearchDetailActivityPanel } from "@/components/admin/SearchDetailActivityPanel";
import { countryCodeToCountryName } from "@/lib/geo/context";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { validActivityIdentity } from "@/lib/adminIdentityActivity";
import { notFound } from "next/navigation";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { SearchWorkspaceBackLink } from "@/components/admin/SearchWorkspaceBackLink";
import { searchDetailReturn } from "@/lib/adminSearchActivityNavigation";
import {
  searchActivityIdentityLabels,
  searchActivityPlatformLabel,
  searchDetailDuration,
  searchDetailHeadline,
  searchDetailOutcomeLabel,
  searchDetailDiagnosisSummary,
  searchDetailNextChecks,
  searchDetailCrawlerName,
  searchDetailCrawlerEvidenceLabel,
} from "@/lib/adminSearchDetailPresentation";
import { AdminLocalTimestamp } from "@/components/admin/AdminLocalTimestamp";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { formatViewerTimestamp } from "@/lib/adminLocalTime";
import type { AdminSearchActivityDetail } from "@/services/adminOperationalReadContract";
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
  const timeZone = await getAdminViewerTimeZone();
  const raw = await searchParams;
  const back = searchDetailReturn(raw);
  const query = new URLSearchParams();
  const environment = typeof raw.environment === "string" ? raw.environment : "";
  if (environment) query.set("environment", environment);
  const result = await adminOperationalReads.searchActivity.detail(id, query);
  if (result.status === "not_found") notFound();

  return (
    <>
      <SearchWorkspaceBackLink href={back.href} label={back.label} />
      <AdminPageShell title="Search detail" hideHeader>
        {result.status === "ok" ? (
          <SearchDetailContent search={result.data} timeZone={timeZone} />
        ) : (
          <div className="border-y border-[#E5E7EB] py-8 text-[12px] text-[#6B7280]">
            This search record is unavailable for the requested admin scope.
          </div>
        )}
      </AdminPageShell>
    </>
  );
}

function SearchDetailContent({ search, timeZone }: { search: AdminSearchActivityDetail; timeZone: string }) {
  const diagnostic = search.diagnostic;
  const showProviderReasons = diagnostic.providers.some(provider => provider.status !== "SUCCESS");
  const identityKind = search.identity.kind;
  const isBot = identityKind === "bot";
  const accountName = identityKind === "registered" ? search.searcher.name : null;
  const accountEmail = identityKind === "registered" ? search.searcher.email : null;
  const activity = isBot ? null : search.searcher.activity;
  const activityKind = activity?.kind === "user" ? "user" : "guest";
  const searcherName = isBot ? searchDetailCrawlerName(search.crawler?.name) : accountName || accountEmail;
  const countryCode = search.network?.countryCode;
  const country = countryCode ? (countryCodeToCountryName(countryCode) || countryCode) + " (" + countryCode + ")" : "Unavailable";
  const providerReasonCodes = diagnostic.providers
    .filter(provider => provider.reasonCode)
    .map(provider => provider.provider + ": " + provider.reasonCode);

  return (
    <div className="mx-auto w-full max-w-[1500px] text-[#374151]">
      <section className="border-b border-[#E5E7EB] px-2 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-[#111827]">Search overview</h2>
            <p className="mt-2 text-[18px] font-semibold tracking-tight text-[#111827]">
              {searchDetailHeadline(search)}
            </p>
            <p className="mt-1 text-[12px] font-medium text-[#6B7280]">
              Searched <AdminLocalTimestamp value={search.createdAt} timeZone={timeZone} />
            </p>
          </div>
          <StatusDot status={diagnostic.outcome === "ZERO_RESULTS" ? "ZERO_RESULTS" : search.status} label={searchDetailOutcomeLabel(diagnostic.outcome)} />
        </div>
        <div className={"mt-4 grid grid-cols-2 gap-y-3 border-t border-[#E5E7EB] pt-3 " + (search.product === "HOTEL" ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
          {search.product === "HOTEL" ? <>
            <Metric label="Property groups returned" value={search.hotelPropertyCount == null ? "Not recorded" : search.hotelPropertyCount.toLocaleString()} />
            <Metric label={search.hotelPropertyCount == null ? "Recorded results" : "Individual offers returned"} value={search.resultCount.toLocaleString()} />
          </> : <Metric label="Results found" value={search.resultCount.toLocaleString()} />}
          <Metric label="Duration" value={searchDetailDuration(search.latencyMs)} />
          <Metric label="Providers" value={search.providerTelemetry ? String(search.providerTelemetry.total) : "—"} />
        </div>
      </section>

      <section className="border-b border-[#E5E7EB] px-2 py-4">
        <h2 className="text-[14px] font-semibold text-[#111827]">Search information</h2>
        <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 md:grid-cols-3 lg:grid-cols-5">
          <Field label="Platform" value={searchActivityPlatformLabel(search.applicationSource)} />
          {isBot ? <Field label="Verification" value={searchDetailCrawlerEvidenceLabel(search.crawler?.evidence)} /> : null}
          {search.appVersion?<Field label="App version" value={search.appVersion}/>:null}
          {/* Product and locations are already identifiable in the Search overview headline. */}
          {search.checkIn || search.checkOut ? (
            <Field
              label={search.product === "HOTEL" ? "Stay dates" : search.product === "CAR" ? "Rental dates" : "Travel dates"}
              value={formatTravelDates(search.checkIn, search.checkOut)}
            />
          ) : null}
          {search.market ? <Field label="Market" value={search.market} /> : null}
          {search.currency ? <Field label="Currency" value={search.currency} /> : null}
          <Field label="Country" value={country} />
          <Field label="IP address" value={search.network?.ipAddress || "Unavailable"} />
        </div>
        <div className="mt-4 border-t border-[#E5E7EB] pt-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#6B7280]">Searched by</p>
          <div className="mt-2 min-w-0 sm:flex sm:items-start sm:justify-between sm:gap-5">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#111827]">{searchActivityIdentityLabels[identityKind]}</p>
              {searcherName ? (
                <p className="mt-0.5 break-words text-[12px] text-[#6B7280]">{searcherName}</p>
              ) : null}
              {accountName && accountEmail ? (
                <p className="mt-0.5 break-words text-[12px] text-[#6B7280]">{accountEmail}</p>
              ) : null}
            </div>
            {activity && validActivityIdentity(activityKind, activity.id) ? (
              <Link href={"/admin/users/" + activityKind + "/" + encodeURIComponent(activity.id) + "/activity"}
                className="focus-ring mt-2 inline-flex shrink-0 min-h-9 items-center text-[13px] font-medium text-[#004BB8] hover:underline sm:mt-0">
                {activity.kind === "user" ? "View user details ↗" : activity.kind === "guest" ? "View guest activity" : "View recorded guest session"}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-b border-[#E5E7EB] px-2 py-4">
        <h2 className="text-[14px] font-semibold text-[#111827]">Provider outcomes</h2>
        {diagnostic.providers.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[740px] border-collapse text-left text-[13px]">
              <thead><tr className="border-b border-[#E5E7EB] text-[11px] uppercase tracking-[0.08em] text-[#6B7280]">
                <th className="px-2 py-3 font-semibold">Provider</th>
                <th className="px-2 py-3 font-semibold">Status</th>
                {showProviderReasons ? <th className="px-2 py-3 font-semibold">Reason</th> : null}
                <th className="px-2 py-3 text-right font-semibold">Duration</th>
              </tr></thead>
              <tbody>
                {diagnostic.providers.map((provider, index) => (
                  <tr key={provider.provider + "-" + provider.observedAt + "-" + index} className="border-b border-[#E5E7EB] text-[#374151] last:border-b-0">
                    <td className="px-2 py-3 align-top">
                      <p className="font-semibold text-[#111827]">{provider.provider}</p>
                    </td>
                    <td className="px-2 py-3 align-top"><StatusDot status={provider.status} /></td>
                    {showProviderReasons ? <td className="px-2 py-3 align-top">{provider.status === "SUCCESS" ? "—" : provider.reason}</td> : null}
                    <td className="whitespace-nowrap px-2 py-3 text-right align-top">{searchDetailDuration(provider.latencyMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-[13px] leading-5 text-[#6B7280]">
            No exact provider execution records are available for this search. A provider cause cannot be confirmed.
          </p>
        )}
      </section>

      <SearchDetailActivityPanel
        key={search.environment + ":" + search.id}
        searchId={search.id}
        environment={search.environment}
        timeZone={timeZone}
      />

      {diagnostic.outcome !== "SUCCESS" ? (
        <section className="border-b border-[#E5E7EB] px-2 py-4">
          <h2 className="text-[14px] font-semibold text-[#111827]">Search diagnosis</h2>
          {searchDetailDiagnosisSummary(diagnostic) ? (
            <p className="mt-2 text-[13px] leading-5 text-[#374151]">{searchDetailDiagnosisSummary(diagnostic)}</p>
          ) : null}
          {searchDetailNextChecks(diagnostic.providers).length ? (
            <div className="mt-3 text-[13px] leading-5 text-[#374151]">
              <p className="font-semibold text-[#111827]">What to check</p>
              {searchDetailNextChecks(diagnostic.providers).map((check, index) => (
                <p key={check.provider + "-" + index} className="mt-1">
                  <span className="font-semibold">{check.provider}:</span> {check.guidance}
                </p>
              ))}
            </div>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
            <Field label="Retryable" value={diagnostic.retryable === null ? "Unknown" : diagnostic.retryable ? "Yes" : "No"} />
            <Field label="Provider evidence" value={diagnostic.correlation === "exact" ? "Exact provider records available" : "Exact provider records unavailable"} />
          </div>
        </section>
      ) : null}

      <section className="border-b border-[#E5E7EB] px-2 py-4">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 [&::-webkit-details-marker]:hidden">
            <h2 className="text-[14px] font-semibold text-[#111827]">Technical details</h2>
            <ChevronDown size={17} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-[#E5E7EB] pt-4 lg:grid-cols-3">
            <Field label="Search ID" value={search.id} />
            {search.requestId ? <Field label="Request ID" value={search.requestId} /> : null}
            {diagnostic.outcome !== "SUCCESS" ? <Field label="Reason code" value={diagnostic.reasonCode} /> : null}
            <Field
              label="Correlation"
              value={diagnostic.correlation === "exact" ? "Exact provider telemetry" : "Legacy / general fallback"}
            />
            <Field label="Environment" value={search.environment} />
            {search.identity.userId ? <Field label="User ID" value={search.identity.userId} /> : null}
            {search.identity.visitorId ? <Field label="Visitor ID" value={search.identity.visitorId} /> : null}
            {search.operationalSessionId ? <Field label="Operational session ID" value={search.operationalSessionId} /> : null}
            {providerReasonCodes.length ? <Field label="Provider reason codes" value={providerReasonCodes.join("; ")} /> : null}
            {diagnostic.providers.some(provider => Math.abs(Date.parse(provider.observedAt) - Date.parse(search.createdAt)) > 60_000) ? (
              <Field label="Provider observation times" value={diagnostic.providers.map(provider => provider.provider + ": " + formatViewerTimestamp(provider.observedAt, timeZone)).join("; ")} />
            ) : null}
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
  return <span className={"inline-flex items-center gap-1.5 text-[13px] font-semibold " + state.text}>
    <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + state.dot} />
    {label ?? state.label}
  </span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-[#6B7280]">{label}</p>
      <p className="mt-1 break-words text-[24px] font-medium tabular-nums text-[#111827]">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 border-b border-[#E5E7EB] py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#6B7280]">{label}</p>
      <div className="mt-1 break-words text-[13px] font-medium text-[#111827]">{value}</div>
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
