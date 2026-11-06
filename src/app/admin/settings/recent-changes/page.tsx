import Link from "next/link";

import { listFeatureControls } from "@/lib/feature-controls/service";

export const metadata = { title: "Admin Settings - Recent Changes" };

function formatControlUpdateDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function AdminRecentSettingsChangesPage() {
  const featureControls = await listFeatureControls();
  const recentControlUpdates = featureControls.controls
    .filter((control) => Boolean(control.state.updatedAt))
    .sort((a, b) => Date.parse(b.state.updatedAt || "") - Date.parse(a.state.updatedAt || ""))
    .slice(0, 4);

  return (
    <section aria-labelledby="settings-section-title" className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#D8E1EC] pb-4">
        <div>
          <h2 id="settings-section-title" className="text-[17px] font-semibold leading-6 tracking-[-0.01em] text-[#020617]">Recent changes</h2>
          <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Latest persisted feature-control changes.</p>
        </div>
        <Link
          href="/admin/logs?range=30d&action=FEATURE_CONTROL_UPDATED&targetType=FeatureFlag"
          className="inline-flex min-h-6 items-center text-[12px] font-medium text-[#004BB8] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"
        >
          View audit history
        </Link>
      </div>
      {recentControlUpdates.length ? (
        <div className="min-w-0 border-b border-[#D8E1EC]">
          <div className="hidden grid-cols-[minmax(0,1fr)_108px_140px] gap-3 border-b border-[#E7ECF5] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#64748B] sm:grid">
            <span>Setting</span>
            <span>State</span>
            <span>Changed</span>
          </div>
          <div className="divide-y divide-[#E7ECF5]">
            {recentControlUpdates.map((control) => (
              <div key={control.key} className="grid min-w-0 gap-1 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_108px_140px] sm:items-center sm:gap-3">
                <p className="min-w-0 text-[13px] font-medium text-[#020617] sm:truncate">{control.name}</p>
                <span className={"text-[12px] font-medium " + (control.state.enabled ? "text-emerald-700" : "text-[#475569]")}>
                  {control.state.enabled ? "Enabled" : "Disabled"}
                </span>
                <span className="text-[12px] text-[#64748B]">{formatControlUpdateDate(control.state.updatedAt!)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p role="status" className="border-b border-[#D8E1EC] py-4 text-[13px] text-[#64748B]">No persisted control updates yet.</p>
      )}
    </section>
  );
}
