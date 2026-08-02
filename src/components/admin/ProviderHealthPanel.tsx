"use client";

import { useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, RefreshCcw, ServerCog } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type ProviderStatus = {
  configured: boolean;
  connected: boolean;
  latencyMs: number;
  lastError?: string;
  checkedAt: string;
};

type ProviderHealthResponse = {
  environment: {
    nodeEnv?: string;
    appUrlConfigured?: boolean;
    databaseConfigured?: boolean;
    databaseConnected?: boolean;
    duffelConfigured?: boolean;
  };
  providers: {
    duffel: ProviderStatus;
  };
  pausedProviders?: Array<{ name: string; status: string; note: string }>;
};

export function ProviderHealthPanel({ enabled }: { enabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProviderHealthResponse | null>(null);
  const [error, setError] = useState("");

  async function runCheck() {
    if (!enabled) return;
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/provider-health", { cache: "no-store" });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(payload.error || "Unable to run provider health check.");
      return;
    }
    setData(payload);
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-dark">Provider health</p>
          <h2 className="mt-1 text-xl font-bold text-navy">Flight metasearch infrastructure</h2>
          <p className="mt-1 text-sm text-muted">Duffel is the active flight provider. Paused providers are not treated as failures.</p>
        </div>
        <Button onClick={runCheck} disabled={!enabled || loading} variant="secondary">
          <RefreshCcw size={16} />
          {loading ? "Checking..." : "Run health check"}
        </Button>
      </div>
      {!enabled ? <p className="mt-4 rounded-md bg-amber/10 p-3 text-sm font-semibold text-amber">Sign in as an admin listed in ADMIN_EMAILS to run provider health checks.</p> : null}
      {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-danger">{error}</p> : null}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ProviderCard title="Duffel" subtitle="Active flight metasearch provider" status={data?.providers.duffel} />
        <PausedProviderCard providers={data?.pausedProviders || []} />
        <EnvironmentCard data={data?.environment} />
      </div>
    </Card>
  );
}

function ProviderCard({ title, subtitle, status }: { title: string; subtitle: string; status?: ProviderStatus }) {
  const connected = Boolean(status?.connected);
  const configured = Boolean(status?.configured);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-navy">{title}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-muted">{subtitle}</p>
        </div>
        <StatusIcon ok={connected} configured={configured} />
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <StatusLine label="Configured" value={configured ? "Yes" : "Not configured"} ok={configured} neutral={!status} />
        <StatusLine label="Connected" value={connected ? "Healthy" : configured ? "Needs attention" : "Paused until configured"} ok={connected} neutral={!status || !configured} />
        <StatusLine label="Latency" value={status ? `${status.latencyMs}ms` : "Waiting"} ok={connected} neutral={!status} />
        <StatusLine label="Last test" value={status ? new Date(status.checkedAt).toLocaleString() : "Not run"} ok={connected} neutral={!status} />
      </div>
      {status?.lastError ? <p className="mt-4 rounded-md bg-amber/10 p-3 text-xs font-semibold text-amber">Duffel health check needs attention. Check server logs and credentials.</p> : null}
    </div>
  );
}

function PausedProviderCard({ providers }: { providers: Array<{ name: string; status: string; note: string }> }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-bold text-navy">Paused / future providers</h3>
      <p className="mt-1 text-xs font-semibold leading-5 text-muted">These are not active failures.</p>
      <div className="mt-4 grid gap-2 text-sm">
        {(providers.length ? providers : [{ name: "Additional providers", status: "Not active", note: "Duffel is the active flight provider." }]).map((provider) => (
          <div key={provider.name} className="flex items-center justify-between gap-3">
            <span className="text-muted">{provider.name}</span>
            <span className="font-bold text-muted">{provider.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EnvironmentCard({ data }: { data?: ProviderHealthResponse["environment"] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-navy">Environment</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-muted">Safe runtime status only.</p>
        </div>
        <ServerCog className="text-teal" size={22} />
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <StatusLine label="Runtime" value={data?.nodeEnv || "Waiting"} ok={Boolean(data?.nodeEnv)} neutral={!data} />
        <StatusLine label="App URL" value={data?.appUrlConfigured ? "Configured" : "Missing"} ok={Boolean(data?.appUrlConfigured)} neutral={!data} />
        <StatusLine label="Database" value={data?.databaseConnected ? "Connected" : data?.databaseConfigured ? "Configured" : "Missing"} ok={Boolean(data?.databaseConnected)} neutral={!data} />
        <StatusLine label="Duffel" value={data?.duffelConfigured ? "Configured" : "Not configured"} ok={Boolean(data?.duffelConfigured)} neutral={!data} />
      </div>
    </div>
  );
}

function StatusLine({ label, value, ok, neutral = false }: { label: string; value: string; ok: boolean; neutral?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={cn("font-bold", neutral ? "text-muted" : ok ? "text-teal-dark" : "text-amber")}>{value}</span>
    </div>
  );
}

function StatusIcon({ ok, configured }: { ok: boolean; configured: boolean }) {
  if (ok) return <CheckCircle2 className="text-teal" size={24} />;
  if (configured) return <AlertTriangle className="text-amber" size={24} />;
  return <Activity className="text-muted" size={24} />;
}
