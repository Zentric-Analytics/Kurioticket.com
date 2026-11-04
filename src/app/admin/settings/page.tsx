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

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-medium leading-4 text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-[13px] font-semibold leading-5 text-slate-900">{value}</p>
    </div>
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
      ? "Staging changes allowed"
      : canControlProduction
        ? "Production changes allowed"
        : "View only";
  const recentControlUpdates = featureControls.controls
    .filter((control) => Boolean(control.state.updatedAt))
    .sort((a, b) => Date.parse(b.state.updatedAt || "") - Date.parse(a.state.updatedAt || ""))
    .slice(0, 4);

  return (
    <AdminPageShell
      title="Settings"
      description="Manage persisted platform controls. Secrets and runtime credentials remain deployment-owned."
    >
      <div className="space-y-4">
        <AdminSectionCard className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-slate-950">Platform controls</h2>
            </div>
            <AdminStatusBadge tone={featureControls.dataAvailable ? "good" : "warn"}>
              {featureControls.dataAvailable ? "Control store available" : "Read-only fallback"}
            </AdminStatusBadge>
          </div>

          <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-4">
            <SummaryItem label="Environment" value={featureControls.environment === "STAGING" ? "Staging" : "Production"} />
            <SummaryItem label="Control store" value={featureControls.dataAvailable ? "Available" : "Unavailable"} />
            <SummaryItem label="Current access" value={currentAccess} />
            <SummaryItem label="Production access" value={canControlProduction ? "Authorized" : "Restricted"} />
          </div>

          <div className="mt-4 border-t border-slate-200/80 pt-4">
            <FeatureControlsPanel
              initialControls={featureControls.controls}
              environment={featureControls.environment}
              canControlProduction={canControlProduction}
              operationsAvailable={featureControls.dataAvailable}
            />
          </div>
        </AdminSectionCard>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <AdminSectionCard className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-slate-950">Recent control updates</h2>
              <AdminStatusBadge>Persisted state</AdminStatusBadge>
            </div>
            {recentControlUpdates.length ? (
              <div className="mt-3 divide-y divide-slate-100">
                {recentControlUpdates.map((control) => (
                  <div key={control.key} className="flex min-w-0 items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-slate-900">{control.name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Last recorded update · {formatControlUpdateDate(control.state.updatedAt!)}
                      </p>
                    </div>
                    <AdminStatusBadge tone={control.state.enabled ? "good" : "neutral"}>
                      {control.state.enabled ? "Enabled" : "Disabled"}
                    </AdminStatusBadge>
                  </div>
                ))}
              </div>
            ) : (
              <p role="status" className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] text-slate-600">
                No persisted control updates yet.
              </p>
            )}
          </AdminSectionCard>

          <section aria-labelledby="related-settings-operations-heading" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 id="related-settings-operations-heading" className="text-[15px] font-semibold text-slate-950">Related operations</h2>
            <div className="mt-3 flex min-w-0 items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-900">Homepage Fare Operations</p>
                <p className="mt-0.5 text-[12px] leading-5 text-slate-600">Provider-backed homepage fare readiness and refresh.</p>
              </div>
              <Link href="/admin/homepage-fares" aria-label="Open fare operations" className="inline-flex h-8 shrink-0 items-center rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-indigo-700 hover:border-slate-300 hover:bg-slate-50">
                Open
              </Link>
            </div>
          </section>
        </div>

        <AdminSectionCard className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-slate-950">Deployment-owned configuration</h2>
            <AdminStatusBadge tone="info">Managed outside Admin</AdminStatusBadge>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            <div className="rounded-lg bg-slate-50 px-3 py-3">
              <h3 className="text-[13px] font-semibold text-slate-900">Runtime & credentials</h3>
              <p className="mt-1 text-[12px] leading-5 text-slate-600">
                Database URLs, API keys, session secrets, provider credentials and server environment variables are not editable here.
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-3">
              <h3 className="text-[13px] font-semibold text-slate-900">Admin access</h3>
              <p className="mt-1 text-[12px] leading-5 text-slate-600">
                Admin allowlists and production feature-controller permissions remain in server configuration.
              </p>
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard className="p-4 sm:p-5">
          <h2 className="text-[15px] font-semibold text-slate-950">Change safeguards</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <AdminStatusBadge tone="good">Persisted controls</AdminStatusBadge>
            <AdminStatusBadge tone="good">Audited changes</AdminStatusBadge>
            <AdminStatusBadge>Production permission</AdminStatusBadge>
            <AdminStatusBadge>Recent reauthentication</AdminStatusBadge>
            <AdminStatusBadge>No secrets exposed</AdminStatusBadge>
          </div>
        </AdminSectionCard>
      </div>
    </AdminPageShell>
  );
}
