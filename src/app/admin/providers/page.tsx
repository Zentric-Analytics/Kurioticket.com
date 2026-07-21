import Link from "next/link";

import { AdminPageShell, AdminProviderStatusCard, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
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
      title="Provider Readiness"
      description="Monitor provider configuration, search availability, booking capability, and recent health checks across Kurioticket products."
    >
      <nav className="mb-4 overflow-x-auto" aria-label="Provider product filter">
        <div className="flex min-w-max flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
          {productFilters.map((filter) => {
            const active = filter.key === activeFilter;
            return (
              <Link
                key={filter.key}
                href={filter.href}
                aria-current={active ? "page" : undefined}
                className={`focus-ring inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950"
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

      <AdminSectionCard className="mt-4 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">Provider health retest</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Retesting records real provider health when the backing endpoint and credentials are available.</p>
          </div>
          <ProviderRetestButton />
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
      <AdminProviderStatusCard {...provider} />
      <AdminSectionCard className="p-5">
        <h2 id={`provider-${provider.product.toLowerCase()}-heading`} className="font-semibold text-slate-950">{guidance.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{guidance.note}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {guidance.badges.map((badge) => <AdminStatusBadge key={badge.label} tone={badge.tone}>{badge.label}</AdminStatusBadge>)}
        </div>
      </AdminSectionCard>
    </section>
  );
}
