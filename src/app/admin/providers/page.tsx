import AdminReferralAttributionPage from "@/app/admin/referral-attribution/page";
import Link from "next/link";

import { ProviderRetestButton } from "@/components/admin/ProviderRetestButton";
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
const tableCellClass = "px-3 py-3 align-top text-[13px] text-[#020617]";

export default async function AdminProvidersPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const filter = normalizeProductFilter(raw.product);
  const attribution = raw.view === "attribution";

  // Referral reporting has its own read path; avoid unnecessary readiness queries.
  const providerData = attribution
    ? null
    : await Promise.all([getProviderStatuses(), getProviderOperationalStatuses()]);
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

  return (
    <div className="w-full min-w-0 bg-white text-[#020617]">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-[#020617]">Providers</h1>
        <p className="mt-1 text-[13px] leading-5 text-[#475569]">
          Monitor provider availability, search reliability, and external referrals.
        </p>
      </header>

      <nav aria-label="Provider reporting sections" className="mt-4 flex min-w-0 gap-6 overflow-x-auto border-b border-[#D8E1EC]">
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
        <div className="pt-5">
          <AdminReferralAttributionPage embedded searchParams={Promise.resolve(raw)} />
          <div className="mt-5 border-t border-[#D8E1EC] pt-3 text-[13px]">
            <Link href="/admin/redirects?correlation=unavailable"
              className="font-medium text-[#004BB8] hover:underline">
              Handoffs without a linked search
            </Link>
            <p className="mt-1 text-[#64748B]">
              These provider clicks have no verified link to a specific search. This does not mean the redirect failed or a booking occurred.
            </p>
          </div>
        </div>
      ) : (
        <>
          <section aria-labelledby="provider-attention" className="border-b border-[#D8E1EC] py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="provider-attention" className="text-[15px] font-semibold text-[#020617]">
                Providers requiring attention
              </h2>
              <span className="text-[12px] text-[#64748B]">Last 24 hours · Current environment</span>
            </div>
            {operational === null ? (
              <p className="mt-3 text-[13px] text-[#9A3412]" role="status">
                Operational telemetry is unavailable. Provider health cannot be verified right now.
              </p>
            ) : attention.length ? (
              <ul className="mt-2 divide-y divide-[#E7ECF5]">
                {attention.map(provider => (
                  <li key={provider.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-3">
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
                    <Link href={"#provider-operation-" + provider.id}
                      className="shrink-0 text-[13px] font-medium text-[#004BB8] hover:underline">
                      View details ›
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] leading-5 text-[#475569]">
                No failing or degraded provider calls were recorded for this selection in the last 24 hours.
                A provider with no recent activity is not necessarily healthy.
              </p>
            )}
          </section>

          <section aria-labelledby="provider-directory" className="border-b border-[#D8E1EC] py-5">
            <h2 id="provider-directory" className="text-[15px] font-semibold text-[#020617]">All providers</h2>
            <nav aria-label="Filter providers by product"
              className="mt-2 flex min-w-0 gap-5 overflow-x-auto border-b border-[#D8E1EC]">
              {productFilters.map(item => (
                <Link key={item.key} href={item.href}
                  aria-current={filter === item.key ? "page" : undefined}
                  className={"inline-flex h-10 shrink-0 items-center whitespace-nowrap border-b-2 px-1 text-[13px] font-medium text-[#020617] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] " +
                    (filter === item.key ? "border-[#004BB8]" : "border-transparent hover:border-[#D8E1EC]")}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-2 min-w-0 overflow-x-auto" role="region"
              aria-labelledby="provider-directory" tabIndex={0}>
              <table className="w-full min-w-[820px] table-fixed text-left">
                <caption className="sr-only">
                  Provider configuration, service coverage, search health, and last activity for the selected product.
                </caption>
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[16%]" />
                  <col className="w-[23%]" />
                  <col className="w-[17%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="border-b border-[#D8E1EC]">
                  <tr>
                    <th scope="col" className={tableHeadingClass}>Provider</th>
                    <th scope="col" className={tableHeadingClass}>Products</th>
                    <th scope="col" className={tableHeadingClass}>Readiness</th>
                    <th scope="col" className={tableHeadingClass}>Health</th>
                    <th scope="col" className={tableHeadingClass}>Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7ECF5]">
                  {visibleIntegrations.map(integration => {
                    const status = operationalById.get(integration.id);
                    return (
                      <tr key={integration.id} className="hover:bg-[#F8FAFC]">
                        <th scope="row" className={tableCellClass + " font-normal"}>
                          <span className="block text-[13px] font-semibold">{integration.provider}</span>
                          <span className="mt-1 block text-[12px] leading-5 text-[#64748B]">
                            {integration.environment} · {integration.note}
                          </span>
                        </th>
                        <td className={tableCellClass}>
                          {integration.products.map(product => productLabel(product)).join(", ")}
                        </td>
                        <td className={tableCellClass}>
                          <StatusIndicator value={readinessLabel(integration.state)}
                            tone={readinessTone(integration.state)} />
                          <span className="mt-1 block text-[12px] leading-5 text-[#64748B]">
                            Credentials: {integration.configured ? "Yes" : "No"} · Search: {integration.searchEnabled ? "Enabled" : "Not enabled"}
                          </span>
                        </td>
                        <td className={tableCellClass}>
                          {operational === null
                            ? <StatusIndicator value="Unavailable" tone="neutral" />
                            : status
                              ? <StatusIndicator value={operationalLabel(status.operationalState)}
                                tone={operationalTone(status.operationalState)} />
                              : <StatusIndicator value="Not monitored" tone="neutral" />}
                          <span className="mt-1 block text-[12px] text-[#64748B]">
                            Booking: {integration.bookingEnabled ? "Enabled" : "Not live yet"}
                          </span>
                        </td>
                        <td className={tableCellClass}>
                          <ActivityTime value={status?.lastActivityAt ?? null}
                            empty={filter !== "all" && integration.products.length > 1
                              ? "Not tracked by service" : "No recent activity"} />
                        </td>
                      </tr>
                    );
                  })}
                  {catalogues.map(catalogue => (
                    <tr key={"catalogue-" + catalogue.product} className="hover:bg-[#F8FAFC]">
                      <th scope="row" className={tableCellClass + " font-normal"}>
                        <span className="block text-[13px] font-semibold">{catalogue.providerName}</span>
                        <span className="mt-1 block text-[12px] leading-5 text-[#64748B]">
                          {catalogue.environment} · {catalogue.notes}
                        </span>
                      </th>
                      <td className={tableCellClass}>{catalogue.product}</td>
                      <td className={tableCellClass}>
                        <StatusIndicator value={catalogue.searchEnabled ? "Search ready" : "Not ready"}
                          tone={catalogue.searchEnabled ? "good" : "warn"} />
                        <span className="mt-1 block text-[12px] text-[#64748B]">
                          No external credentials required
                        </span>
                      </td>
                      <td className={tableCellClass}>
                        <StatusIndicator value="Internal catalogue" tone="neutral" />
                        <span className="mt-1 block text-[12px] text-[#64748B]">
                          Booking: {catalogue.bookingEnabled ? "Enabled" : "Not live yet"}
                        </span>
                      </td>
                      <td className={tableCellClass}>
                        <span className="text-[12px] text-[#64748B]">Not externally monitored</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="operational-performance" aria-labelledby="operational-performance-heading"
            className="border-b border-[#D8E1EC] py-5">
            <h2 id="operational-performance-heading" className="text-[15px] font-semibold text-[#020617]">
              Operational performance
            </h2>
            <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
              Recorded external provider calls in the current environment over the past 24 hours.
              Disabled calls are not counted as attempts.
            </p>
            {filter !== "all" ? (
              <p className="mt-1 text-[12px] text-[#64748B]">
                Product filtering uses service-specific counts. Latency and activity timestamps are shown only when they are available for that service.
              </p>
            ) : null}
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
                <div className="mt-3 min-w-0 overflow-x-auto" role="region"
                  aria-labelledby="operational-performance-heading" tabIndex={0}>
                  <table className="w-full min-w-[790px] text-left text-[13px]">
                    <caption className="sr-only">Provider call totals and failure rates for the selected product.</caption>
                    <thead className="border-b border-[#D8E1EC]">
                      <tr>
                        {["Provider", "Attempted", "Successful", "Failed", "Degraded", "Failure rate", "Avg latency"].map(label => (
                          <th key={label} scope="col" className={tableHeadingClass}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7ECF5]">
                      {visibleOperational.map(provider => (
                        <tr id={"provider-operation-" + provider.id} key={provider.id}
                          className="scroll-mt-32 hover:bg-[#F8FAFC]">
                          <th scope="row" className={tableCellClass + " font-normal"}>
                            <span className="block font-semibold">{provider.provider}</span>
                            <StatusIndicator value={operationalLabel(provider.operationalState)}
                              tone={operationalTone(provider.operationalState)} />
                            <span className="mt-1 block text-[12px] leading-5 text-[#64748B]">
                              Last success: <ActivityTime value={provider.lastSuccessAt} empty="Not recorded" />
                            </span>
                            <span className="block text-[12px] leading-5 text-[#64748B]">
                              Last failure: <ActivityTime value={provider.lastFailureAt} empty="Not recorded" />
                            </span>
                          </th>
                          <td className={tableCellClass}>{provider.attemptedCalls.toLocaleString()}</td>
                          <td className={tableCellClass}>{provider.successCalls.toLocaleString()}</td>
                          <td className={tableCellClass}>{provider.failedCalls.toLocaleString()}</td>
                          <td className={tableCellClass}>{provider.degradedCalls.toLocaleString()}</td>
                          <td className={tableCellClass}>
                            {formatProviderFailureRatePct(provider.failureRatePct, provider.failedCalls)}
                          </td>
                          <td className={tableCellClass}>
                            {provider.averageLatencyMs === null ? "—" : provider.averageLatencyMs + " ms"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3 className="mt-5 text-[13px] font-semibold text-[#020617]">Search service breakdown</h3>
                <div className="mt-1 divide-y divide-[#E7ECF5]">
                  {visibleOperational.flatMap(provider => provider.serviceBreakdown.map(service => (
                    <div key={provider.id + "-" + service.service} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#020617]">
                          {provider.provider} · {serviceLabel(service.service)}
                        </p>
                        <StatusIndicator value={operationalLabel(service.operationalState)}
                          tone={operationalTone(service.operationalState)} />
                      </div>
                      <div className="min-w-0 text-[12px] leading-5 text-[#475569]">
                        <p>
                          {service.attemptedCalls.toLocaleString()} attempted · {service.successCalls.toLocaleString()} successful · {service.failedCalls.toLocaleString()} failed · {service.disabledCalls.toLocaleString()} disabled · {formatProviderFailureRatePct(service.failureRatePct, service.failedCalls)} failed
                        </p>
                        {service.failureReasons.length ? (
                          <p className="mt-0.5 text-[#64748B]">
                            Reasons: {service.failureReasons.map(reason => reason.label + " (" + reason.calls.toLocaleString() + ")").join(", ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )))}
                </div>
              </>
            )}
          </section>

          <section aria-labelledby="provider-health-checks" className="py-5">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 max-w-3xl">
                <h2 id="provider-health-checks" className="text-[15px] font-semibold text-[#020617]">
                  Provider health checks
                </h2>
                <p className="mt-1 text-[13px] leading-5 text-[#475569]">
                  Retesting records a real Duffel health check and writes an admin audit event.
                  It does not verify booking readiness.
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
                  Audited action · Secrets hidden · Booking remains provider-owned.
                </p>
              </div>
              <div className="shrink-0"><ProviderRetestButton /></div>
            </div>
          </section>
        </>
      )}
    </div>
  );
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
