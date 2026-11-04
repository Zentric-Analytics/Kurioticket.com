import AdminReferralAttributionPage from "@/app/admin/referral-attribution/page";
import { ReferralWindowFilter } from "@/components/admin/ReferralWindowFilter";
import { parseAttributionDays } from "@/services/referralAttributionService";
import Link from "next/link";

import { Info } from "lucide-react";
import { parseProviderHealthRange, providerHealthRangeHref } from "@/lib/adminProviderAttention";
import { ProviderHealthWindowFilter } from "@/components/admin/ProviderHealthWindowFilter";
import { getProviderOutcomeWidths } from "@/lib/adminProviderVisuals";
import { ProviderDirectoryTable, type ProviderDirectoryRecord } from "@/components/admin/ProviderDirectoryTable";
import { formatDateTime, getProviderStatuses } from "@/lib/admin-data";
import {
  filterProviderOperationalStatuses,
  filterProviderStatuses,
  normalizeProductFilter,
  productFilters,
} from "@/lib/adminProviderFilters";
import { getProviderOperationalStatuses } from "@/services/providerOperationalStatus";
import {
  formatProviderFailureRatePct,
  type ProviderOperationalState,
  type ProviderOperationalStatus,
} from "@/services/providerOperationalStatusCore";
import { getProviderIntegrationStatuses } from "@/services/travel/providerIntegrationStatus";

export const metadata = { title: "Admin Providers" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type StatusTone = "good" | "bad" | "warn" | "neutral";

const tableHeadingClass = "px-3 py-3 text-left text-[12px] font-medium uppercase text-[#475569]";
const tableCellClass = "px-3 py-3 align-middle text-[13px] text-[#020617]";
const numberHeadingClass = "px-3 py-3 text-right text-[12px] font-medium uppercase text-[#475569]";

export default async function AdminProvidersPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const filter = normalizeProductFilter(raw.product);
  const attribution = raw.view === "attribution";
  const attributionDays = parseAttributionDays(typeof raw.days === "string" ? raw.days : null);
  const monitoringNow = new Date();
  const monitoringSelection = parseProviderHealthRange(raw, monitoringNow);
  const monitoringHours = monitoringSelection.hours;
  const monitoringRange = monitoringSelection.range;
  const monitoringWindow = monitoringRange
    ? { label: monitoringRange.fromDate + " – " + monitoringRange.toDate }
    : { label: monitoringHours === 72 ? "Last 3 days" : monitoringHours === 168 ? "Last 7 days" : "Last 24 hours" };

  // Referral reporting has its own read path; avoid unnecessary readiness queries.
  const providerData = attribution
    ? null
    : await Promise.all([getProviderStatuses(), getProviderOperationalStatuses(monitoringHours, undefined, monitoringRange ?? undefined).catch(() => null)]);
  const allProviders = providerData?.[0] ?? [];
  const operational = providerData?.[1] ?? null;
  const integrations = attribution ? [] : getProviderIntegrationStatuses();
  const visibleIntegrations = integrations.filter(integration =>
    filter === "all" || integration.products.some(product => product.toLowerCase() === filter)
  );
  const catalogues = filterProviderStatuses(allProviders, filter)
    .filter(provider => provider.product !== "Flights");
  const visibleOperational = filterProviderOperationalStatuses(operational ?? [], filter);
  const operationalById = new Map(visibleOperational.map(provider => [provider.id, provider]));
  const attention = visibleOperational.filter(requiresAttention);
  const unscopedTimingProviders = new Set(integrations.filter(item => item.products.length > 1).map(item => item.id));
  const directoryRows: ProviderDirectoryRecord[] = [
    ...visibleIntegrations.map(integration => {
      const status = operationalById.get(integration.id);
      const unscopedTiming = filter !== "all" && integration.products.length > 1;
      const timingUnavailable = operational === null ? "Unavailable"
        : unscopedTiming ? "Not tracked by service" : "Not recorded in " + monitoringWindow.label.toLowerCase();
      return {
        id: "integration-" + integration.id,
        name: integration.provider,
        products: integration.products.map(productLabel).join(", "),
        shortLabel: null,
        readiness: { label: readinessLabel(integration.state), tone: readinessTone(integration.state) },
        health: operational === null
          ? { label: "Unavailable", tone: "neutral" as const }
          : status
            ? { label: operationalLabel(status.operationalState), tone: operationalTone(status.operationalState) }
            : { label: "Not monitored", tone: "neutral" as const },
        lastActivity: displayTime(status?.lastActivityAt ?? null,
          unscopedTiming ? "Not tracked by service" : operational === null ? "Unavailable" : "No activity in selected window"),
        detail: {
          environment: integration.environment === "test" ? "Test mode"
            : integration.environment === "live" ? "Live mode" : "Sandbox",
          configured: integration.configured ? "Configured" : "Not configured",
          search: integration.searchEnabled ? "Enabled" : "Not enabled",
          booking: integration.bookingEnabled ? "Enabled" : "Not available",
          externalHandoff: integration.externalHandoffEnabled ? "Enabled" : "Not enabled",
          lastSuccess: displayTime(status?.lastSuccessAt ?? null, timingUnavailable),
          lastFailure: displayTime(status?.lastFailureAt ?? null, timingUnavailable),
          note: integration.note,
        },
        canRetestDuffel: integration.id === "duffel",
        canRetestKayak: integration.id === "kayak-sandbox",

      };
    }),
    ...catalogues.map(catalogue => ({
      id: "catalogue-" + catalogue.product.toLowerCase(),
      name: catalogue.providerName,
      products: catalogue.product,
      shortLabel: "Internal catalogue",
      readiness: {
        label: catalogue.searchEnabled ? "Search ready" : "Not ready",
        tone: catalogue.searchEnabled ? "good" as const : "warn" as const,
      },
      health: { label: "Internal catalogue", tone: "neutral" as const },
      lastActivity: displayTime(null, "Not externally monitored"),
      detail: {
        environment: catalogue.environment,
        configured: "Not required",
        search: catalogue.searchEnabled ? "Enabled" : "Not enabled",
        booking: catalogue.bookingEnabled ? "Enabled" : "Not live yet",
        externalHandoff: null,
        lastSuccess: displayTime(null, "Not externally monitored"),
        lastFailure: displayTime(null, "Not externally monitored"),
        note: catalogue.notes,
      },
      canRetestDuffel: false,
      canRetestKayak: false,
    })),
  ];

  return (
    <div className="w-full min-w-0 bg-white text-[#020617]">
      <h1 className="sr-only">Providers</h1>

      <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b border-[#D8E1EC]">
        <nav aria-label="Provider reporting sections" className="flex min-w-0 gap-6">
          <Link href="/admin/providers" aria-current={!attribution ? "page" : undefined}
            className={"inline-flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-1 text-[13px] font-medium text-[#020617] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] " +
              (!attribution ? "border-[#004BB8]" : "border-transparent hover:border-[#D8E1EC]")}>
            Provider Health
          </Link>
          <Link href="/admin/providers?view=attribution" aria-current={attribution ? "page" : undefined}
            className={"inline-flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-1 text-[13px] font-medium text-[#020617] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] " +
              (attribution ? "border-[#004BB8]" : "border-transparent hover:border-[#D8E1EC]")}>
            Referral Attribution
          </Link>
        </nav>
        {attribution ? (
          <div className="ml-auto flex min-w-0 items-center gap-4 pb-1.5">
            <ReferralWindowFilter days={attributionDays ?? 30} embedded />
          </div>
        ) : null}
      </div>

      {attribution ? (
        <div className="pt-3">
          <AdminReferralAttributionPage embedded searchParams={Promise.resolve(raw)} />

        </div>
      ) : (
        <>
          <section aria-labelledby="provider-attention" className="border-b border-[#D8E1EC] pb-5 pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="provider-attention" className="text-[15px] font-semibold text-[#020617]">
                Providers requiring attention
              </h2>
              <ProviderHealthWindowFilter product={filter} hours={monitoringHours} custom={monitoringRange} />
            </div>
            {monitoringSelection.error ? (
              <p className="mt-3 text-[13px] text-rose-700" role="alert">{monitoringSelection.error}</p>
            ) : operational === null ? (
              <p className="mt-3 text-[13px] text-[#9A3412]" role="status">
                Operational telemetry is unavailable. Provider health cannot be verified right now.
              </p>
            ) : attention.length ? (
              <ul className="mt-3 space-y-2">
                {attention.map(provider => (
                  <li key={provider.id}
                    className={"min-w-0 border-l-[3px] pl-3 " +
                      (provider.operationalState === "FAILING" ? "border-rose-500" : "border-amber-500")}>
                    <details className="group py-2.5">
                      <summary className="flex min-w-0 cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-semibold text-[#020617]">{provider.provider}</span>
                            <StatusIndicator value={operationalLabel(provider.operationalState)}
                              tone={operationalTone(provider.operationalState)} />
                          </div>
                          <p className="mt-1 text-[12px] leading-5 text-[#475569]">
                            {attentionSummary(provider)}
                          </p>
                        </div>
                        <span className="shrink-0 text-[13px] font-medium text-[#004BB8]">
                          <span className="group-open:hidden">View details ›</span>
                          <span className="hidden group-open:inline">Hide details ‹</span>
                        </span>
                      </summary>
                      <div className="mt-3 border-t border-[#E7ECF5] pt-3">
                        <dl className="grid max-w-[980px] gap-x-5 gap-y-3 sm:grid-cols-3">
                          <div className="min-w-0">
                            <dt className="text-[12px] text-[#64748B]">Failure rate</dt>
                            <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-[#0F172A]">
                              {formatProviderFailureRatePct(provider.failureRatePct, provider.failedCalls)}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[12px] text-[#64748B]">Last failure</dt>
                            <dd className="mt-0.5 text-[13px] font-medium text-[#0F172A]">
                              <ActivityTime value={provider.lastFailureAt}
                                empty={filter !== "all" && unscopedTimingProviders.has(provider.id)
                                  ? "Not available for this service" : "Not recorded in " + monitoringWindow.label.toLowerCase()} />
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[12px] text-[#64748B]">Last success</dt>
                            <dd className="mt-0.5 text-[13px] font-medium text-[#0F172A]">
                              <ActivityTime value={provider.lastSuccessAt}
                                empty={filter !== "all" && unscopedTimingProviders.has(provider.id)
                                  ? "Not available for this service" : "Not recorded in " + monitoringWindow.label.toLowerCase()} />
                            </dd>
                          </div>
                        </dl>
                        <div role="region" tabIndex={0}
                          aria-label={"Service diagnostics for " + provider.provider}
                          className="mt-4 max-w-[1200px] min-w-0 overflow-x-auto border-t border-[#E7ECF5]">
                          <table className="w-full min-w-[760px] table-fixed text-[12px]">
                            <caption className="sr-only">
                              Recent service status, attempts, failures and failure reasons for {provider.provider}.
                            </caption>
                            <colgroup>
                              <col className="w-[23%]" />
                              <col className="w-[16%]" />
                              <col className="w-[12%]" />
                              <col className="w-[12%]" />
                              <col className="w-[37%]" />
                            </colgroup>
                            <thead>
                              <tr className="border-b border-[#E7ECF5] text-[#64748B]">
                                <th scope="col" className="py-2 pr-3 text-left font-medium">Service</th>
                                <th scope="col" className="px-2 py-2 text-left font-medium">Status</th>
                                <th scope="col" className="px-2 py-2 text-right font-medium">Attempts</th>
                                <th scope="col" className="px-2 py-2 text-right font-medium">Failed</th>
                                <th scope="col" className="py-2 pl-4 text-left font-medium">Main failure reason</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E7ECF5]">
                              {provider.serviceBreakdown.map(service => (
                                <tr key={service.service}>
                                  <th scope="row" className="py-2.5 pr-3 text-left font-medium text-[#0F172A]">
                                    {serviceLabel(service.service)}
                                  </th>
                                  <td className="px-2 py-2.5">
                                    <StatusIndicator value={operationalLabel(service.operationalState)}
                                      tone={operationalTone(service.operationalState)} />
                                  </td>
                                  <td className="px-2 py-2.5 text-right tabular-nums">{service.attemptedCalls.toLocaleString()}</td>
                                  <td className="px-2 py-2.5 text-right tabular-nums">{service.failedCalls.toLocaleString()}</td>
                                  <td className="py-2.5 pl-4 text-[#475569]">
                                    {service.failureReasons.length
                                      ? service.failureReasons.map(reason =>
                                        reason.label + " (" + reason.calls.toLocaleString() + ")").join("; ")
                                      : service.attemptedCalls === 0 ? "No attempts" : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] leading-5 text-[#475569]">
                No provider health warnings were recorded for this selection in the chosen reporting window.
                A provider with no recent activity is not necessarily healthy.
              </p>
            )}
          </section>

          <section aria-labelledby="provider-directory" className="border-b border-[#D8E1EC] pb-6 pt-6">
            <h2 id="provider-directory" className="text-[15px] font-semibold text-[#020617]">All providers</h2>
            
            <nav aria-label="Filter providers by product"
              className="mt-2 flex min-w-0 gap-5 overflow-x-auto border-b border-[#D8E1EC]">
              {productFilters.map(item => (
                <Link key={item.key} href={providerHealthRangeHref(item.key, monitoringRange, monitoringHours)}
                  aria-current={filter === item.key ? "page" : undefined}
                  className={"inline-flex h-10 shrink-0 items-center whitespace-nowrap border-b-2 px-1 text-[13px] font-medium text-[#020617] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] " +
                    (filter === item.key ? "border-[#004BB8]" : "border-transparent hover:border-[#D8E1EC]")}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <ProviderDirectoryTable rows={directoryRows} />
          </section>

          <section id="operational-performance" aria-labelledby="operational-performance-heading"
            className="border-b border-[#D8E1EC] pb-6 pt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="operational-performance-heading" className="text-[15px] font-semibold text-[#020617]">
                Operational performance
              </h2>
            </div>
            {operational === null ? (
              <p className="mt-3 text-[13px] text-[#9A3412]" role="status">
                Operational provider telemetry is unavailable because the database could not be read.
              </p>
            ) : !visibleOperational.length ? (
              <p className="mt-3 text-[13px] text-[#475569]">
                No external provider telemetry is configured for this product.
              </p>
            ) : (
              <>
                <div className="mt-2 divide-y divide-[#E7ECF5]" role="list"
                  aria-label="Provider call outcome comparison">
                  {visibleOperational.map(provider => {
                    const segments = getProviderOutcomeWidths(provider);
                    return (
                      <div id={"provider-operation-" + provider.id} role="listitem"
                        key={provider.id} className="py-4 first:pt-3 last:pb-3">
                        <div className="w-full max-w-[800px]">
                          <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-6 gap-y-1.5">
                            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="text-[13px] font-semibold text-[#020617]">{provider.provider}</span>
                              <StatusIndicator value={operationalLabel(provider.operationalState)}
                                tone={operationalTone(provider.operationalState)} />
                            </div>
                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-[12px] text-[#475569]">
                              <span className="tabular-nums">{provider.attemptedCalls.toLocaleString()} attempted</span>
                              <span tabIndex={0} className="inline-flex text-[#64748B]"
                                title="Disabled calls are not counted as attempts."
                                aria-label="Disabled calls are not counted as attempts.">
                                <Info size={13} aria-hidden="true" />
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">
                                {provider.averageLatencyMs === null
                                  ? "Average latency unavailable"
                                  : provider.averageLatencyMs.toLocaleString() + " ms avg latency"}
                              </span>
                            </div>
                          </div>

                          <div aria-hidden="true"
                            className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-[#E7ECF5]">
                            {segments.hasAttempts ? (
                              <>
                                <span className="h-full bg-emerald-600"
                                  style={{ width: String(segments.successPct) + "%" }} />
                                <span className="h-full bg-rose-500"
                                  style={{ width: String(segments.failurePct) + "%" }} />
                                <span className="h-full bg-amber-500"
                                  style={{ width: String(segments.degradedPct) + "%" }} />
                              </>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]">
                          <span className="inline-flex items-center gap-1.5 text-[#475569]">
                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            <span className="tabular-nums">{provider.successCalls.toLocaleString()}</span> successful
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[#475569]">
                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            <span className="tabular-nums">{provider.failedCalls.toLocaleString()}</span> failed
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[#475569]">
                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            <span className="tabular-nums">{provider.degradedCalls.toLocaleString()}</span> degraded
                          </span>
                          <span className="tabular-nums text-[#475569]">
                            Failure rate: {formatProviderFailureRatePct(provider.failureRatePct, provider.failedCalls)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <h3 id="service-breakdown-heading" className="mt-6 border-t border-[#E7ECF5] pt-4 text-[12px] font-semibold text-[#334155]">
                  Search service breakdown
                </h3>
                <div className="mt-1 min-w-0 overflow-x-auto" role="region"
                  aria-labelledby="service-breakdown-heading" tabIndex={0}>
                  <table className="w-full min-w-[1050px] table-fixed text-[13px]">
                    <caption className="sr-only">
                      Search service call counts and classified failure reasons for the selected product.
                    </caption>
                    <colgroup>
                      <col className="w-[20%]" />
                      <col className="w-[10%]" />
                      <col className="w-[9%]" />
                      <col className="w-[9%]" />
                      <col className="w-[9%]" />
                      <col className="w-[9%]" />
                      <col className="w-[10%]" />
                      <col className="w-[24%]" />
                    </colgroup>
                    <thead className="border-b border-[#D8E1EC]">
                      <tr>
                        <th scope="col" className={tableHeadingClass}>Provider / service</th>
                        <th scope="col" className={tableHeadingClass}>Status</th>
                        {["Attempts", "Success", "Failed", "Disabled", "Failure %"].map(label => (
                          <th scope="col" key={label} className={numberHeadingClass}>{label}</th>
                        ))}
                        <th scope="col" className={tableHeadingClass}>Failure reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7ECF5]">
                      {visibleOperational.flatMap(provider => provider.serviceBreakdown.map(service => (
                        <tr key={provider.id + "-" + service.service} className="hover:bg-[#F8FAFC]">
                          <th scope="row" className={tableCellClass + " text-left font-normal"}>
                            <span className="block font-semibold">{provider.provider}</span>
                            <span className="mt-0.5 block text-[12px] text-[#64748B]">
                              {serviceLabel(service.service)}
                            </span>
                          </th>
                          <td className={tableCellClass}>
                            <StatusIndicator value={operationalLabel(service.operationalState)}
                              tone={operationalTone(service.operationalState)} />
                          </td>
                          <td className={tableCellClass + " text-right tabular-nums"}>{service.attemptedCalls.toLocaleString()}</td>
                          <td className={tableCellClass + " text-right tabular-nums"}>{service.successCalls.toLocaleString()}</td>
                          <td className={tableCellClass + " text-right tabular-nums"}>{service.failedCalls.toLocaleString()}</td>
                          <td className={tableCellClass + " text-right tabular-nums"}>{service.disabledCalls.toLocaleString()}</td>
                          <td className={tableCellClass + " text-right tabular-nums"}>
                            {service.failureRatePct === null ? "No attempts" :
                              formatProviderFailureRatePct(service.failureRatePct, service.failedCalls)}
                          </td>
                          <td className={tableCellClass + " text-left text-[12px] leading-5 text-[#475569]"}>
                            {service.failureReasons.length ? (
                              <ul aria-label={"Failure reasons for " + provider.provider + " " + serviceLabel(service.service)}
                                className="min-w-0 space-y-1">
                                {service.failureReasons.map(reason => (
                                  <li key={reason.code}
                                    className="flex min-w-0 items-baseline justify-between gap-3">
                                    <span className="min-w-0 break-words">{reason.label}</span>
                                    <span className="shrink-0 font-medium tabular-nums text-[#0F172A]">
                                      {reason.calls.toLocaleString()}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : "—"}
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

        </>
      )}
    </div>
  );
}

function displayTime(value: string | null, empty: string) {
  return value
    ? { text: formatDateTime(new Date(value)), iso: value }
    : { text: empty, iso: null };
}

function requiresAttention(provider: ProviderOperationalStatus) {
  return provider.operationalState === "FAILING"
    || provider.operationalState === "DEGRADED"
    || (provider.operationalState === "NOT_READY"
      && provider.readinessState !== "DISABLED");
}

function attentionSummary(provider: ProviderOperationalStatus) {
  if (provider.operationalState === "NOT_READY") {
    return "Provider is not ready: " + readinessLabel(provider.readinessState) + ". Review configuration and environment restrictions.";
  }
  const affected = provider.serviceBreakdown.filter(service =>
    service.operationalState === "FAILING" || service.operationalState === "DEGRADED");
  const reasons = Array.from(new Set(affected.flatMap(service =>
    service.failureReasons.map(reason => reason.label))));
  return [
    affected.map(service => serviceLabel(service.service)).join(", "),
    reasons.join(", ") || "Recent provider failures detected",
  ].filter(Boolean).join(" · ");
}

function productLabel(product: string) {
  return product.charAt(0) + product.slice(1).toLowerCase();
}

function serviceLabel(service: string) {
  if (service === "flight-search") return "Flight search";
  if (service === "hotel-search") return "Hotel search";
  if (service === "car-search") return "Car search";
  return service.replaceAll("-", " ");
}

function readinessLabel(state: string) {
  if (state === "READY") return "Ready";
  if (state === "DISABLED") return "Disabled";
  if (state === "NOT_CONFIGURED") return "Not configured";
  if (state === "ENVIRONMENT_BLOCKED") return "Environment blocked";
  return state.replaceAll("_", " ").toLowerCase();
}

function readinessTone(state: string): StatusTone {
  if (state === "READY") return "good";
  if (state === "DISABLED") return "neutral";
  return "warn";
}

function operationalLabel(state: ProviderOperationalState) {
  if (state === "NO_RECENT_ACTIVITY") return "No recent activity";
  if (state === "NOT_READY") return "Not ready";
  return state.charAt(0) + state.slice(1).toLowerCase();
}

function operationalTone(state: ProviderOperationalState): StatusTone {
  if (state === "HEALTHY") return "good";
  if (state === "FAILING") return "bad";
  if (state === "DEGRADED" || state === "NOT_READY") return "warn";
  return "neutral";
}

function StatusIndicator({ value, tone }: { value: string; tone: StatusTone }) {
  const colors: Record<StatusTone, string> = {
    good: "text-emerald-700",
    bad: "text-rose-700",
    warn: "text-amber-700",
    neutral: "text-[#475569]",
  };
  const dots: Record<StatusTone, string> = {
    good: "bg-emerald-500",
    bad: "bg-rose-500",
    warn: "bg-amber-500",
    neutral: "bg-slate-400",
  };
  return (
    <span className={"inline-flex items-center gap-1.5 text-[12px] font-medium " + colors[tone]}>
      <span aria-hidden="true" className={"h-1.5 w-1.5 shrink-0 rounded-full " + dots[tone]} />
      {value}
    </span>
  );
}

function ActivityTime({ value, empty = "Not recorded" }: { value: string | null; empty?: string }) {
  return value
    ? <time dateTime={value}>{formatDateTime(new Date(value))}</time>
    : <span className="text-[12px] text-[#64748B]">{empty}</span>;
}
