import Link from "next/link";

import type { AdminAuditRead } from "@/services/adminAuditReadContract";
import { adminAuditReads } from "@/services/adminAuditReadService";

export const metadata = { title: "Admin Settings - Recent Changes" };

const windowDays = 90;
const maxRecentChanges = 6;

function formatAuditDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value)) + " UTC";
}

function settingsActionLabel(action: string) {
  return action === "FEATURE_CONTROL_UPDATED" ? "Feature control updated" : "Notification preference updated";
}

function settingsSectionLabel(action: string) {
  return action === "FEATURE_CONTROL_UPDATED" ? "Feature controls" : "Notifications";
}

export default async function AdminRecentSettingsChangesPage() {
  const now = new Date();
  const from = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  function auditQuery(action: string, targetType: string) {
    return new URLSearchParams({
      from: from.toISOString(),
      to: now.toISOString(),
      action,
      targetType,
      limit: String(maxRecentChanges),
    });
  }

  // Reuse the authoritative, permission-checked audit reader rather than
  // treating feature flag initialization timestamps as admin changes.
  const [features, notifications] = await Promise.all([
    adminAuditReads.list(auditQuery("FEATURE_CONTROL_UPDATED", "FeatureFlag")),
    adminAuditReads.list(auditQuery("ADMIN_NOTIFICATION_PREFERENCE_UPDATED", "AdminNotificationPreference")),
  ]);

  const available = features.status === "ok" && notifications.status === "ok";
  const forbidden = features.status === "forbidden" || notifications.status === "forbidden";
  const history: AdminAuditRead[] = features.status === "ok" && notifications.status === "ok"
    ? [...features.data.items, ...notifications.data.items]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
      .slice(0, maxRecentChanges)
    : [];

  return (
    <section aria-labelledby="settings-section-title" className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#D8E1EC] pb-4">
        <div>
          <h2 id="settings-section-title" className="text-[17px] font-semibold leading-6 tracking-[-0.01em] text-[#020617]">Recent changes</h2>
          <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
            Recorded administrator Settings actions from the last 90 days.
          </p>
        </div>
        <Link
          href="/admin/logs?range=90d"
          className="inline-flex min-h-6 items-center text-[12px] font-medium text-[#004BB8] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"
        >
          View audit history
        </Link>
      </div>
      {!available ? (
        <p role="status" className="border-b border-[#D8E1EC] py-4 text-[13px] text-[#64748B]">
          {forbidden
            ? "Administrator access is required to view Settings history."
            : "Settings audit history is temporarily unavailable. Records have not been verified."}
        </p>
      ) : history.length ? (
        <div className="min-w-0 border-b border-[#D8E1EC]">
          <div className="hidden gap-3 border-b border-[#E7ECF5] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#64748B] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_150px]">
            <span>Setting</span><span>Action</span><span>Administrator</span><span>When</span>
          </div>
          <div className="divide-y divide-[#E7ECF5]">
            {history.map((item) => (
              <div key={item.id} className="grid min-w-0 gap-1 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_150px] lg:items-center lg:gap-3">
                <p className="min-w-0 break-words text-[13px] font-medium text-[#020617]">{settingsSectionLabel(item.action)}</p>
                <p className="min-w-0 text-[12px] text-[#475569]">
                  <span className="text-[#64748B] lg:hidden">Action: </span>{settingsActionLabel(item.action)}
                </p>
                <p className="min-w-0 break-all text-[12px] text-[#475569]">
                  <span className="text-[#64748B] lg:hidden">By: </span>{item.adminEmail}
                </p>
                <time dateTime={item.createdAt} className="text-[12px] leading-5 text-[#64748B]">
                  <span className="lg:hidden">When: </span>{formatAuditDate(item.createdAt)}
                </time>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p role="status" className="border-b border-[#D8E1EC] py-4 text-[13px] text-[#64748B]">
          No recorded Settings changes in the last 90 days. Initial feature-control setup is not an administrator change.
        </p>
      )}
    </section>
  );
}
