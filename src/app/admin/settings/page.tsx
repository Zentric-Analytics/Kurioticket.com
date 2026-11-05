import { getServerSession } from "next-auth";

import {
  AdminPageShell,
  AdminSectionCard,
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

export default async function AdminSettingsPage() {
  const [featureControls, session] = await Promise.all([
    listFeatureControls(),
    getServerSession(authOptions),
  ]);
  const currentEmail = session?.user?.email?.trim().toLowerCase() || "";
  const canControlProduction = getFeatureControlProductionAdmins().includes(currentEmail);
  const recentControlUpdates = featureControls.controls
    .filter((control) => Boolean(control.state.updatedAt))
    .sort((a, b) => Date.parse(b.state.updatedAt || "") - Date.parse(a.state.updatedAt || ""))
    .slice(0, 4);

  return (
    <AdminPageShell title="Settings" hideHeader>
      <AdminSectionCard className="overflow-hidden p-0">
        <section aria-labelledby="feature-controls-heading" className="px-4 py-5 sm:px-5">
          <h2 id="feature-controls-heading" className="mb-4 text-[15px] font-semibold text-slate-950">Feature controls</h2>
          <FeatureControlsPanel
            initialControls={featureControls.controls}
            environment={featureControls.environment}
            canControlProduction={canControlProduction}
            operationsAvailable={featureControls.dataAvailable}
          />
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
          <h2 id="recent-settings-changes-heading" className="text-[15px] font-semibold text-slate-950">Recent changes</h2>
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

      </AdminSectionCard>
    </AdminPageShell>
  );
}
