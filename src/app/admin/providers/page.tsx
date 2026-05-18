import { AdminPageShell, StatusPill } from "@/components/admin/AdminPageShell";
import { ProviderRetestButton } from "@/components/admin/ProviderRetestButton";
import { ProviderHealthPanel } from "@/components/admin/ProviderHealthPanel";
import { Card } from "@/components/ui/Card";
import { getDuffelAdminHealth, pausedProviderRows } from "@/lib/admin-data";

export const metadata = { title: "Admin Providers" };

export default async function AdminProvidersPage() {
  const duffel = await getDuffelAdminHealth();
  return (
    <AdminPageShell title="Providers" description="Duffel is the active flight metasearch provider. Future providers are shown as paused or not configured, not as production failures.">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <h2 className="text-xl font-bold text-navy">Duffel</h2>
          <p className="mt-1 text-sm text-muted">Core active provider for flight metasearch infrastructure and external booking handoff foundation.</p>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <StatusLine label="Configured" value={duffel.configured ? "Yes" : "Not configured"} good={duffel.configured} />
            <StatusLine label="Connected" value={duffel.connected ? "Healthy" : duffel.configured ? "Needs attention" : "Not tested"} good={duffel.connected} />
            <StatusLine label="Mode" value={process.env.DUFFEL_API_KEY ? "Configured by API key" : "Not configured"} good={Boolean(process.env.DUFFEL_API_KEY)} />
            <StatusLine label="Latency" value={`${duffel.latencyMs || 0}ms`} good={duffel.connected} />
            <StatusLine label="Last health check" value={duffel.checkedAt ? new Date(duffel.checkedAt).toLocaleString() : "Not run"} good={Boolean(duffel.checkedAt)} />
            <StatusLine label="Search provider" value="Active foundation" good />
            <StatusLine label="Booking handoff" value="External provider redirect foundation" good />
          </div>
          {duffel.lastError ? <p className="mt-4 rounded-md bg-amber/10 p-3 text-sm font-semibold text-amber">Duffel health needs attention. Check server logs and provider credentials.</p> : null}
          <div className="mt-5"><ProviderRetestButton /></div>
        </Card>
        <Card className="p-5">
          <h2 className="text-xl font-bold text-navy">Paused / future providers</h2>
          <p className="mt-1 text-sm text-muted">These are intentionally not active and are not treated as failed providers.</p>
          <div className="mt-4 grid gap-3">
            {pausedProviderRows.map((provider) => <div key={provider.name} className="rounded-md border border-border p-3"><div className="flex justify-between gap-3"><b>{provider.name}</b><StatusPill>{provider.status}</StatusPill></div><p className="mt-1 text-sm text-muted">{provider.note}</p></div>)}
          </div>
        </Card>
      </div>
      <div className="mt-6"><ProviderHealthPanel enabled /></div>
    </AdminPageShell>
  );
}

function StatusLine({ label, value, good }: { label: string; value: string; good: boolean }) {
  return <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3"><span className="text-muted">{label}</span><span className={good ? "font-bold text-teal-dark" : "font-bold text-amber"}>{value}</span></div>;
}
