"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import {
  providerHandoffFiltersHref,
  type ProviderHandoffFilterScope,
  type ProviderHandoffFilterValues,
} from "@/lib/adminProviderHandoffFilterUrl";

const productOptions = [
  { value: "", label: "All products" },
  { value: "FLIGHT", label: "Flights" },
  { value: "HOTEL", label: "Hotels" },
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
const environmentOptions = [
  { value: "", label: "Current environment" },
  { value: "staging", label: "Staging" },
  { value: "production", label: "Production" },
];

/** The standalone records toolbar follows User Activity's instant filter rules.
 * The embedded Search Activity list deliberately keeps its existing form. */
export function ProviderHandoffFilters({
  initial,
  scope,
}: {
  initial: ProviderHandoffFilterValues;
  scope: ProviderHandoffFilterScope;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitted = useRef("");

  useEffect(() => {
    if (timeout.current) clearTimeout(timeout.current);
    submitted.current = "";
    setValues(initial);
  }, [
    initial.product, initial.identity, initial.correlation,
    initial.provider, initial.environment,
    scope.userId, scope.visitorId, scope.from, scope.to,
  ]);
  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  const navigate = (next: ProviderHandoffFilterValues, changeIdentity = false) => {
    const href = providerHandoffFiltersHref(next, scope, changeIdentity);
    if (submitted.current === href) return;
    submitted.current = href;
    startTransition(() => router.replace(href, { scroll: false }));
  };

  const update = (
    patch: Partial<ProviderHandoffFilterValues>,
    debounce = false,
    changeIdentity = false,
  ) => {
    const next = { ...values, ...patch };
    setValues(next);
    if (timeout.current) clearTimeout(timeout.current);
    if (debounce) timeout.current = setTimeout(() => navigate(next), 300);
    else navigate(next, changeIdentity);
  };

  return (
    <div role="search" aria-label="Filter provider handoffs"
      className="min-w-0 border-b border-[#D8E1EC] pb-2">
      <label className="relative block min-w-0">
        <span className="sr-only">Search by provider</span>
        <Search size={16} aria-hidden="true"
          className="pointer-events-none absolute left-3 top-3.5 text-[#64748B]" />
        <input type="search" aria-label="Search by provider" value={values.provider}
          maxLength={100} placeholder="Search by provider"
          onChange={event => update({ provider: event.target.value }, true)}
          onKeyDown={event => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (timeout.current) clearTimeout(timeout.current);
              navigate(values);
            }
          }}
          className="h-11 w-full min-w-0 rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-[13px] text-[#0F172A] outline-none placeholder:text-[#64748B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]" />
      </label>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1">
        <SearchMonitorSelect label="Product" name="product"
          value={values.product} options={productOptions} appearance="plain"
          onValueChange={value => update({ product: value })} />
        <SearchMonitorSelect label="Identity" name="identity"
          value={values.identity} options={identityOptions} appearance="plain"
          onValueChange={value => update({ identity: value }, false, true)} />
        <SearchMonitorSelect label="Search link" name="correlation"
          value={values.correlation} options={correlationOptions} appearance="plain"
          onValueChange={value => update({ correlation: value })} />
        <SearchMonitorSelect label="Environment" name="environment"
          value={values.environment} options={environmentOptions} appearance="plain"
          align="end" onValueChange={value => update({ environment: value })} />
      </div>
      <span aria-live="polite" className="sr-only">
        {pending ? "Refreshing provider handoffs…" : ""}
      </span>
    </div>
  );
}
