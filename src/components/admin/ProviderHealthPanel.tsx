"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, ServerCog } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type ProviderHealthResponse = {
  environment: {
    nodeEnv: string;
    productionRuntime: boolean;
    appUrlConfigured: boolean;
    databaseConfigured: boolean;
  };
  providers: {
    duffel: ProviderStatus;
    travelpayouts: ProviderStatus & {
      markerConfigured: boolean;
      marker?: string;
    };
  };
};

type ProviderStatus = {
  configured: boolean;
  connected: boolean;
  latencyMs: number;
  lastError?: string;
  checkedAt: string;
};

export function ProviderHealthPanel({ enabled }: { enabled: boolean }) {
  const [data, setData] = useState<ProviderHealthResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadHealth() {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/provider-health", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load provider health.");
      setData(payload as ProviderHealthResponse);
    } catch (healthError) {
      setError(healthError instanceof Error ? healthError.message : "Unable to load provider health.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHealth();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return (
    <Card className="border-slate-200 p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold text-teal-dark">Provider Health</p>
          <h2 className="mt-1 text-2xl font-bold text-navy">Live API Readiness</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Admin-only health checks for live Duffel flight offers and Travelpayouts affiliate intelligence.
          </p>
        </div>
        <Button variant="secondary" onClick={loadHealth} disabled={!enabled || loading}>
          <RefreshCw size={16} className={cn(loading && "animate-spin")} />
          Retest Providers
        </Button>
      </div>

      {!enabled ? (
        <div className="mt-5 rounded-md border border-amber/30 bg-amber/10 p-4 text-sm text-amber">
          Sign in as an admin listed in ADMIN_EMAILS to run provider health checks.
        </div>
      ) : error ? (
        <div className="mt-5 rounded-md border border-danger/30 bg-red-50 p-4 text-sm text-danger">{error}</div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ProviderCard title="Duffel" subtitle="Primary live flight provider" status={data?.providers.duffel} />
        <ProviderCard
          title="Travelpayouts"
          subtitle={`Affiliate, discovery, and SEO layer${data?.providers.travelpayouts.marker ? ` (${data.providers.travelpayouts.marker})` : ""}`}
          status={data?.providers.travelpayouts}
          markerConfigured={data?.providers.travelpayouts.markerConfigured}
        />
        <EnvironmentCard data={data?.environment} />
      </div>
    </Card>
  );
}

function ProviderCard({
  title,
  subtitle,
  status,
  markerConfigured,
}: {
  title: string;
  subtitle: string;
  status?: ProviderStatus;
  markerConfigured?: boolean;
}) {
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
        <StatusLine label="Configured" value={configured ? "Yes" : "Missing"} ok={configured} />
        {markerConfigured !== undefined ? <StatusLine label="Marker" value={markerConfigured ? "Configured" : "Missing"} ok={markerConfigured} /> : null}
        <StatusLine label="Connected" value={connected ? "Healthy" : configured ? "Failing" : "Not tested"} ok={connected} />
        <StatusLine label="Latency" value={status ? `${status.latencyMs}ms` : "Waiting"} ok={connected} neutral={!status} />
        <StatusLine label="Last test" value={status ? new Date(status.checkedAt).toLocaleString() : "Not run"} ok={connected} neutral={!status} />
      </div>
      {status?.lastError ? <p className="mt-4 rounded-md bg-red-50 p-3 text-xs font-semibold text-danger">{status.lastError}</p> : null}
    </div>
  );
}

function EnvironmentCard({ data }: { data?: ProviderHealthResponse["environment"] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-navy">Environment</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-muted">Deployment and runtime configuration.</p>
        </div>
        <ServerCog className="text-teal" size={22} />
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <StatusLine label="Runtime" value={data?.nodeEnv || "Waiting"} ok={Boolean(data?.nodeEnv)} neutral={!data} />
        <StatusLine label="Production mode" value={data?.productionRuntime ? "Yes" : "No"} ok={Boolean(data?.productionRuntime)} neutral={!data} />
        <StatusLine label="App URL" value={data?.appUrlConfigured ? "Configured" : "Missing"} ok={Boolean(data?.appUrlConfigured)} neutral={!data} />
        <StatusLine label="Database" value={data?.databaseConfigured ? "Configured" : "Missing"} ok={Boolean(data?.databaseConfigured)} neutral={!data} />
      </div>
    </div>
  );
}

function StatusLine({ label, value, ok, neutral = false }: { label: string; value: string; ok: boolean; neutral?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={cn("font-bold", neutral ? "text-muted" : ok ? "text-teal-dark" : "text-danger")}>{value}</span>
    </div>
  );
}

function StatusIcon({ ok, configured }: { ok: boolean; configured: boolean }) {
  if (ok) return <CheckCircle2 className="text-teal" size={24} />;
  if (configured) return <AlertTriangle className="text-amber" size={24} />;
  return <Activity className="text-muted" size={24} />;
}
