import Link from "next/link";
import { getServerSession } from "next-auth";

import {
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { FeatureControlsPanel } from "@/components/admin/FeatureControlsPanel";
import { authOptions } from "@/lib/auth";
import { getFeatureControlProductionAdmins } from "@/lib/env";
import { listFeatureControls } from "@/lib/feature-controls/service";

export const metadata = { title: "Admin Settings" };

function formatControlUpdateDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function ContextItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] leading-5 text-slate-600">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </span>
  );
}

export default async function AdminSettingsPage() {
  const [featureControls, session] = await Promise.all([
    listFeatureControls(),
    getServerSession(authOptions),
  ]);
  const currentEmail = session?.user?.email?.trim().toLowerCase() || "";
  const canControlProduction = getFeatureControlProductionAdmins().includes(currentEmail);
  const currentAccess = !featureControls.dataAvailable
    ? "Read only"
    : featureControls.environment === "STAGING"
      ? "Can edit Staging"
      : canControlProduction
        ? "Can edit Production"
        : "View only";
  const recentControlUpdates = featureControls.controls
    .filter((control) => Boolean(control.state.updatedAt))
    .sort((a, b) => Date.parse(b.state.updatedAt || "") - Date.parse(a.state.updatedAt || ""))
    .slice(0, 4);

  return (
    <AdminPageShell
      title="Settings"
      description="Manage platform controls and operational configuration."
    >
      <AdminSectionCard className="overflow-hidden p-0">
        <section aria-label="Environment and access" className="px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
            <span className="inline-flex h-6 items-center rounded-md bg-slate-900 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
              {featureControls.environment === "STAGING" ? "Staging" : "Production"}
            </span>
            <ContextItem label="Control store" value={featureControls.dataAvailable ? "Available" : "Unavailable"} />
            <ContextItem label="Your access" value={currentAccess} />
            <ContextItem label="Production" value={canControlProduction ? "Authorized" : "Restricted"} />
            <span className="ml-auto">
              <AdminStatusBadge tone={featureControls.dataAvailable ? "good" : "warn"}>
                {featureControls.dataAvailable ? "Store available" : "Read-only fallback"}
              </AdminStatusBadge>
            </span>
          </div>
        </section>

        <section aria-labelledby="feature-controls-heading" className="border-t border-slate-200 px-4 py-5 sm:px-5">
          <div className="mb-4">
            <h2 id="feature-controls-heading" className="text-[15px] font-semibold text-slate-950">Feature controls</h2>
            <p className="mt-1 text-[12px] leading-5 text-slate-600">
              Turn major travel functions on or off. Every change requires confirmation.
            </p>
          </div>
          <FeatureControlsPanel
            initialControls={featureControls.controls}
            environment={featureControls.environment}
            canControlProduction={canControlProduction}
            operationsAvailable={featureControls.dataAvailable}
          />
        </section>

        <section aria-labelledby="settings-operations-heading" className="border-t border-slate-200 px-4 py-5 sm:px-5">
          <h2 id="settings-operations-heading" className="text-[15px] font-semibold text-slate-950">Operations</h2>
          <div className="mt-3 flex min-w-0 items-center justify-between gap-4 py-1">
            <div className="min-w-0">
              <h3 className="text-[13px] font-semibold text-slate-900">Homepage Fare Operations</h3>
              <p className="mt-1 text-[12px] leading-5 text-slate-600">Provider-backed homepage fare readiness and refresh.</p>
            </div>
            <Link
              href="/admin/homepage-fares"
              aria-label="Open fare operations"
              className="inline-flex h-8 shrink-0 items-center rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold text-indigo-700 hover:border-slate-300 hover:bg-slate-50"
            >
              Open
            </Link>
          </div>
        </section>

        <section aria-labelledby="configuration-ownership-heading" className="border-t border-slate-200 px-4 py-5 sm:px-5">
          <h2 id="configuration-ownership-heading" className="text-[15px] font-semibold text-slate-950">Configuration ownership</h2>
          <div className="mt-3 divide-y divide-slate-100">
            <div className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold text-slate-900">Runtime & credentials</h3>
                <p className="mt-1 max-w-3xl text-[12px] leading-5 text-slate-600">
                  Database URLs, API keys, session secrets, provider credentials and server environment variables are not editable here.
                </p>
              </div>
              <span className="shrink-0 text-[12px] font-semibold text-slate-500">Managed externally</span>
            </div>
            <div className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold text-slate-900">Admin access</h3>
                <p className="mt-1 max-w-3xl text-[12px] leading-5 text-slate-600">
                  Admin allowlists and production feature-controller permissions remain in server configuration.
                </p>
              </div>
              <span className="shrink-0 text-[12px] font-semibold text-slate-500">Managed externally</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="recent-settings-changes-heading" className="border-t border-slate-200 px-4 py-5 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="recent-settings-changes-heading" className="text-[15px] font-semibold text-slate-950">Recent changes</h2>
            <span className="text-[11px] font-medium text-slate-500">Persisted feature state</span>
          </div>
          {recentControlUpdates.length ? (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
              <div className="hidden grid-cols-[minmax(0,1fr)_110px_140px] gap-4 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500 sm:grid">
                <span>Setting</span>
                <span>State</span>
                <span>Changed</span>
              </div>
              <div className="divide-y divide-slate-100">
                {recentControlUpdates.map((control) => (
                  <div key={control.key} className="grid min-w-0 gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_110px_140px] sm:items-center sm:gap-4">
                    <p className="min-w-0 truncate text-[13px] font-medium text-slate-900">{control.name}</p>
                    <span className={"text-[12px] font-semibold " + (control.state.enabled ? "text-emerald-700" : "text-slate-600")}>
                      {control.state.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <span className="text-[12px] text-slate-500">{formatControlUpdateDate(control.state.updatedAt!)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p role="status" className="mt-3 text-[13px] text-slate-600">No persisted control updates yet.</p>
          )}
        </section>

        <footer className="border-t border-slate-200 bg-slate-50/60 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-5 text-slate-600">
            <span className="font-semibold text-slate-800">Protected changes</span>
            <span aria-hidden="true">•</span>
            <span>Audited</span>
            <span aria-hidden="true">•</span>
            <span>Production authorization</span>
            <span aria-hidden="true">•</span>
            <span>Recent reauthentication</span>
            <span aria-hidden="true">•</span>
            <span>No secrets exposed</span>
          </div>
        </footer>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
