"use client";

import { useState } from "react";

import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import type { HandoffDateRange } from "@/lib/adminHandoffDateRange";
import type {
  ProviderHandoffFilterScope,
  ProviderHandoffFilterValues,
} from "@/lib/adminProviderHandoffFilterUrl";
import type { HandoffProviderOption } from "@/lib/adminHandoffProviderOptions";

const productOptions = [
  { value: "", label: "All products" },
  { value: "FLIGHT", label: "Flights" },
  { value: "HOTEL", label: "Hotels" },
  { value: "CAR", label: "Cars" },
];
const identityOptions = [
  { value: "all", label: "All identities" },
  { value: "registered", label: "Registered" },
  { value: "guest", label: "Guest" },
  { value: "unattributed", label: "Unattributed" },
];
const correlationOptions = [
  { value: "", label: "All correlations" },
  { value: "exact", label: "Linked to search" },
  { value: "unavailable", label: "Search link unavailable" },
];
const rangeOptions = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

/**
 * The standalone handoffs workspace has one explicit apply action: choosing
 * a dropdown edits only its form field, not the active record query. Existing
 * deep-linked customer/date/environment scope stays in hidden form controls.
 * Backend authorization and strict query validation remain unchanged.
 */
export function ProviderHandoffFilters({
  initial,
  scope,
  range,
  providerOptions,
}: {
  initial: ProviderHandoffFilterValues;
  scope: ProviderHandoffFilterScope;
  range: HandoffDateRange;
  providerOptions: readonly HandoffProviderOption[];
}) {
  const [selectedRange, setSelectedRange] = useState<HandoffDateRange>(range);
  const dateOptions = range === "custom"
    ? [...rangeOptions, { value: "custom", label: "Custom range" }]
    : rangeOptions;

  return (
    <form
      action="/admin/redirects"
      method="get"
      role="search"
      aria-label="Filter provider handoffs"
      className="min-w-0"
    >
      <header className="border-b border-[#D8E1EC] pb-4 pt-1">
        <h1 className="text-[20px] font-semibold leading-7 tracking-[-0.02em] text-[#020617]">
          Provider Handoffs
        </h1>
      </header>

      {/* These scopes are intentional backend context, not user-facing filters. */}
      {initial.environment ? <input type="hidden" name="environment" value={initial.environment} /> : null}
      {scope.userId ? <input type="hidden" name="userId" value={scope.userId} /> : null}
      {scope.visitorId ? <input type="hidden" name="visitorId" value={scope.visitorId} /> : null}
      {scope.sourcePage ? <input type="hidden" name="sourcePage" value={scope.sourcePage} /> : null}
      {selectedRange === "custom" ? (
        <>
          {scope.from ? <input type="hidden" name="from" value={scope.from} /> : null}
          {scope.to ? <input type="hidden" name="to" value={scope.to} /> : null}
        </>
      ) : null}

      <div data-testid="provider-handoffs-filter-row" className="grid min-w-0 grid-cols-1 items-center gap-2 border-b border-[#D8E1EC] py-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_120px] lg:gap-2">
        <div data-testid="provider-handoffs-date-range" className="min-w-0">
          <SearchMonitorSelect label="Date range" name="range"
            value={selectedRange} options={dateOptions} appearance="fare"
            onValueChange={value => setSelectedRange(value as HandoffDateRange)} truncateLabel />
        </div>
        <div className="min-w-0">
          <SearchMonitorSelect label="Provider" name="provider"
            value={initial.provider} options={providerOptions} appearance="fare"
            truncateLabel />
        </div>
        <div className="min-w-0">
          <SearchMonitorSelect label="Product" name="product"
            value={initial.product} options={productOptions} appearance="fare" truncateLabel />
        </div>
        <div className="min-w-0">
          <SearchMonitorSelect label="Identity" name="identity"
            value={initial.identity} options={identityOptions} appearance="fare"
            clearFieldNamesOnChange={["userId", "visitorId"]} truncateLabel />
        </div>
        <div className="min-w-0">
          <SearchMonitorSelect label="Search link" name="correlation"
            value={initial.correlation} options={correlationOptions} appearance="fare" align="end"
            truncateLabel />
        </div>
        <button
          type="submit"
          className="inline-flex h-10 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-3 text-[13px] font-medium text-white transition-colors hover:bg-[#003D97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]"
        >
          Apply filters
        </button>
      </div>
    </form>
  );
}
