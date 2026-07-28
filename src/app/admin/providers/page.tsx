import Link from "next/link";

import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { ProviderRetestButton } from "@/components/admin/ProviderRetestButton";
import { getProviderStatuses } from "@/lib/admin-data";
import { filterProviderStatuses, normalizeProductFilter, productFilters, type AdminProviderStatus, type ProviderProduct } from "@/lib/adminProviderFilters";

export const metadata = { title: "Admin Providers" };

type SearchParams = Promise<{ product?: string | string[] }>;

const productGuidance: Record<ProviderProduct, { title: string; note: string; badges: Array<{ label: string; tone?: "good" | "bad" | "warn" | "neutral" | "info" }> }> = {
  Flights: {
    title: "Flight operational boundary",
    note: "Flight search visibility comes from real search logs and provider configuration. Booking actions stay unavailable unless a production booking workflow is connected.",
    badges: [{ label: "Operational visibility", tone: "info" }, { label: "Booking not live by default", tone: "warn" }],
  },
  Hotels: {
    title: "Hotel inventory and booking boundary",
    note: "Hotel inventory, ratings, confirmations, and bookings are shown only when returned from real configured provider data.",
    badges: [{ label: "Provider data only" }, { label: "Booking not live yet", tone: "warn" }],
  },
  Cars: {
    title: "Car provider boundary",
    note: "No fake car provider inventory, pickup cards, bookings, provider uptime, or confirmations are displayed. Configure a real car provider before operational data appears here.",
    badges: [{ label: "Pending provider" }, { label: "Not live yet", tone: "warn" }],
  },
};

export default async function AdminProvidersPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = await searchParams;
  const activeFilter = normalizeProductFilter(params?.product);
  const providers = await getProviderStatuses();
  const visibleProviders = filterProviderStatuses(providers, activeFilter);

  return (
    <AdminPageShell
      eyebrow=""
      title="Provider Readiness"
      description="Monitor provider configuration, search availability, booking capability, and recent health checks across Kurioticket products."
    >
      <nav className="-mx-1 overflow-x-auto px-1 pb-1" aria-label="Provider product filter">
        <div className="inline-flex min-w-max gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
          {productFilters.map((filter) => {
            const active = filter.key === activeFilter;
            return (
              <Link
                key={filter.key}
                href={filter.href}
                aria-current={active ? "page" : undefined}
                className={`focus-ring inline-flex min-h-9 items-center rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                  active ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-950"
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="grid gap-4 xl:grid-cols-3">
        {visibleProviders.map((provider) => <ProviderReadinessSection key={provider.product} provider={provider} />)}
      </div>

      <AdminSectionCard className="mt-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-950">Provider health retest</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Retesting records real provider health when the backing endpoint and credentials are available.</p>
          </div>
          <div className="w-full shrink-0 sm:w-auto"><ProviderRetestButton /></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <AdminStatusBadge tone="info">Duffel only</AdminStatusBadge>
          <AdminStatusBadge tone="info">Audit-log ready action</AdminStatusBadge>
          <AdminStatusBadge>Secrets hidden</AdminStatusBadge>
          <AdminStatusBadge>Cars pending unless configured</AdminStatusBadge>
        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}

function ProviderReadinessSection({ provider }: { provider: AdminProviderStatus }) {
  const guidance = productGuidance[provider.product];

  return (
    <section className="grid gap-4" aria-labelledby={`provider-${provider.product.toLowerCase()}-heading`}>
      <ProviderReadinessCard provider={provider} />
      <AdminSectionCard className="p-4">
        <h2 id={`provider-${provider.product.toLowerCase()}-heading`} className="font-semibold text-slate-950">{guidance.title}</h2>
        <p className="mt-1.5 text-sm leading-6 text-slate-600">{guidance.note}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {guidance.badges.map((badge) => <AdminStatusBadge key={badge.label} tone={badge.tone}>{badge.label}</AdminStatusBadge>)}
        </div>
      </AdminSectionCard>
    </section>
  );
}

function ProviderReadinessCard({ provider }: { provider: AdminProviderStatus }) {
  const configured = provider.providerName !== "Not connected";
  const primaryStatus = provider.searchEnabled ? "Search ready" : provider.credentialsPresent ? "Configured" : configured ? "Unavailable" : "Not configured";
  const primaryTone = provider.searchEnabled ? "good" : provider.credentialsPresent ? "warn" : configured ? "bad" : "neutral";

  return (
    <AdminSectionCard className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-950">{provider.providerName}</h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{provider.product}</p>
        </div>
        <AdminStatusBadge tone={primaryTone}>{primaryStatus}</AdminStatusBadge>
      </div>

      {!configured ? (
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">{provider.product}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">No approved {provider.product.toLowerCase().replace(/s$/, "")} provider is connected yet.</p>
        </div>
      ) : null}

      <div className="divide-y divide-slate-100 px-4" aria-label={`${provider.product} readiness summary`}>
        <ReadinessRow label="Environment" value={provider.environment} tone={provider.environment === "Unavailable" ? "neutral" : "good"} />
        <ReadinessRow label="Credentials" value={provider.credentialsPresent ? "Credentials present" : "Unavailable"} tone={provider.credentialsPresent ? "good" : "neutral"} />
        <ReadinessRow label="Search" value={provider.searchEnabled ? "Search enabled" : "Unavailable"} tone={provider.searchEnabled ? "good" : "neutral"} />
        <ReadinessRow label="Booking" value={provider.bookingEnabled ? "Booking enabled" : "Not live yet"} tone={provider.bookingEnabled ? "good" : "warn"} />
        <ReadinessRow label="Provider readiness" value={primaryStatus} tone={primaryTone} />
      </div>

      <div className="border-y border-slate-100 bg-slate-50/70 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Recent health</h3>
        <dl className="mt-2 grid gap-2 text-sm">
          <HealthRow label="Last success" value={provider.lastSuccessfulRequest || "Unavailable"} tone={provider.lastSuccessfulRequest ? "good" : "neutral"} />
          <HealthRow label="Last failure" value={provider.lastFailedRequest || "Unavailable"} tone={provider.lastFailedRequest ? "bad" : "neutral"} />
        </dl>
      </div>

      <p className="px-4 py-3 text-sm leading-6 text-slate-600">{provider.notes}</p>
    </AdminSectionCard>
  );
}

function ReadinessRow({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" | "warn" | "neutral" }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[minmax(8rem,0.8fr)_minmax(0,1.2fr)] sm:items-center">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="sm:justify-self-start"><AdminStatusBadge tone={tone}>{value}</AdminStatusBadge></span>
    </div>
  );
}

function HealthRow({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" | "neutral" }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:items-baseline">
      <dt className="text-slate-500">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 font-semibold text-slate-800">
        <span className={`h-2 w-2 shrink-0 rounded-full ${tone === "good" ? "bg-emerald-500" : tone === "bad" ? "bg-rose-500" : "bg-slate-300"}`} aria-hidden="true" />
        <span className="break-words">{value}</span>
      </dd>
    </div>
  );
}
