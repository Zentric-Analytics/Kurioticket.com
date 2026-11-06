import Link from "next/link";
import { getServerSession } from "next-auth";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
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
      <div className="w-full min-w-0 bg-white text-[#020617]">
        <section aria-labelledby="feature-controls-heading" className="border-b border-[#D8E1EC] pb-5">
          <h2 id="feature-controls-heading" className="text-[15px] font-semibold text-[#020617]">Feature controls</h2>
          <p className="mt-1 max-w-4xl text-[12px] leading-5 text-[#64748B]">
            Persisted controls determine whether Kurioticket capabilities may operate. Operational health is monitored in Providers and the relevant operational workspaces.
          </p>
          <div className="mt-4">
            <FeatureControlsPanel
              initialControls={featureControls.controls}
              environment={featureControls.environment}
              canControlProduction={canControlProduction}
              operationsAvailable={featureControls.dataAvailable}
            />
          </div>
        </section>

        <section aria-labelledby="recent-settings-changes-heading" className="border-b border-[#D8E1EC] py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="recent-settings-changes-heading" className="text-[15px] font-semibold text-[#020617]">Recent settings changes</h2>
            <Link
              href="/admin/logs?range=30d&action=FEATURE_CONTROL_UPDATED&targetType=FeatureFlag"
              className="text-[13px] font-medium text-[#004BB8] hover:underline"
            >
              View settings audit history
            </Link>
          </div>
          {recentControlUpdates.length ? (
            <div className="mt-3 min-w-0 overflow-x-auto border-y border-[#D8E1EC]">
              <div className="hidden min-w-[620px] grid-cols-[minmax(0,1fr)_120px_150px] gap-4 border-b border-[#E7ECF5] px-3 py-2 text-[12px] font-medium uppercase text-[#64748B] sm:grid">
                <span>Setting</span>
                <span>State</span>
                <span>Changed</span>
              </div>
              <div className="min-w-[620px] divide-y divide-[#E7ECF5]">
                {recentControlUpdates.map((control) => (
                  <div key={control.key} className="grid min-w-0 gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_120px_150px] sm:items-center sm:gap-4">
                    <p className="min-w-0 truncate text-[13px] font-medium text-[#020617]">{control.name}</p>
                    <span className={"text-[12px] font-medium " + (control.state.enabled ? "text-emerald-700" : "text-[#475569]")}>
                      {control.state.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <span className="text-[12px] text-[#64748B]">{formatControlUpdateDate(control.state.updatedAt!)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p role="status" className="mt-3 text-[13px] text-[#64748B]">No persisted control updates yet.</p>
          )}
        </section>

        <section aria-labelledby="managed-outside-settings-heading" className="py-5">
          <h2 id="managed-outside-settings-heading" className="text-[15px] font-semibold text-[#020617]">Managed outside Settings</h2>
          <div className="mt-3 divide-y divide-[#E7ECF5] border-y border-[#D8E1EC]">
            <div className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold text-[#020617]">Runtime & credentials</h3>
                <p className="mt-1 max-w-3xl text-[12px] leading-5 text-[#64748B]">
                  Database URLs, API keys, session secrets, provider credentials and server environment variables remain deployment-owned and are not editable here.
                </p>
              </div>
              <span className="shrink-0 text-[12px] font-medium text-[#64748B]">Deployment managed</span>
            </div>
            <div className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold text-[#020617]">Administrator access</h3>
                <p className="mt-1 max-w-3xl text-[12px] leading-5 text-[#64748B]">
                  Administrator allowlists and production feature-control permissions remain server-managed. Preview team membership continues to use Team Access where available.
                </p>
              </div>
              <span className="shrink-0 text-[12px] font-medium text-[#64748B]">Access managed separately</span>
            </div>
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}
