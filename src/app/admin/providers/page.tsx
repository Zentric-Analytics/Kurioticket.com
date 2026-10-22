import Link from "next/link";

import { AdminPageShell, AdminProviderStatusCard, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { ProviderRetestButton } from "@/components/admin/ProviderRetestButton";
import { formatDateTime, getProviderStatuses } from "@/lib/admin-data";
import { filterProviderStatuses, normalizeProductFilter, productFilters } from "@/lib/adminProviderFilters";
import { getProviderOperationalStatuses } from "@/services/providerOperationalStatus";

export const metadata = { title: "Admin Providers" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminProvidersPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const filter = normalizeProductFilter(raw.product);
  const [allProviders, operational] = await Promise.all([
    getProviderStatuses(),
    getProviderOperationalStatuses(),
  ]);
  const providers = filterProviderStatuses(allProviders, filter);

  return (
    <AdminPageShell
      title="Provider Readiness"
      description="Configuration, search readiness and recent provider-call health. Credentials are shown only as yes/no; secret values are never exposed."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {productFilters.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={filter === item.key ? "page" : undefined}
            className={filter === item.key
              ? "rounded-xl bg-indigo-700 px-3 py-2 text-sm font-black text-white"
              : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {providers.length ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {providers.map((provider) => <AdminProviderStatusCard key={provider.product} {...provider} />)}
        </div>
      ) : null}

      <AdminSectionCard className="mt-4 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-black text-slate-950">Provider health retest</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Retesting records a real Duffel health check and writes an admin audit event. It does not claim booking readiness.</p>
          </div>
          <ProviderRetestButton />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <AdminStatusBadge tone="info">Audited action</AdminStatusBadge>
          <AdminStatusBadge>Secrets hidden</AdminStatusBadge>
          <AdminStatusBadge>Booking remains provider-owned</AdminStatusBadge>
        </div>
      </AdminSectionCard>

      <AdminSectionCard className="mt-4 p-5">
        <h2 className="font-black text-slate-950">Recent operational health</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">Observed provider calls in the current environment over the last 24 hours. No recent activity is shown separately from failure.</p>
        {operational === null ? (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Operational provider telemetry is unavailable because the database could not be read.</p>
        ) : (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {operational.map((provider) => (
              <div key={provider.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{provider.provider}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{provider.windowHours}-hour window</p>
                  </div>
                  <AdminStatusBadge tone={operationalTone(provider.operationalState)}>{provider.operationalState.replaceAll("_", " ")}</AdminStatusBadge>
                </div>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <Stat label="Readiness" value={provider.readinessState.replaceAll("_", " ")} />
                  <Stat label="Total calls" value={String(provider.totalCalls)} />
                  <Stat label="Success" value={String(provider.successCalls)} />
                  <Stat label="Failed" value={String(provider.failedCalls)} />
                  <Stat label="Degraded" value={String(provider.degradedCalls)} />
                  <Stat label="Average latency" value={provider.averageLatencyMs === null ? "—" : provider.averageLatencyMs + " ms"} />
                  <Stat label="Last success" value={provider.lastSuccessAt ? formatDateTime(new Date(provider.lastSuccessAt)) : "—"} />
                  <Stat label="Last failure" value={provider.lastFailureAt ? formatDateTime(new Date(provider.lastFailureAt)) : "—"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminSectionCard>
    </AdminPageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white px-3 py-2"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p></div>;
}

function operationalTone(state: string) {
  if (state === "HEALTHY") return "good" as const;
  if (state === "DEGRADED" || state === "NO_RECENT_ACTIVITY") return "warn" as const;
  if (state === "FAILING") return "bad" as const;
  return "neutral" as const;
}
