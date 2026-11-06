import { getServerSession } from "next-auth";

import { AdminNotificationPreferencesPanel } from "@/components/admin/AdminNotificationPreferencesPanel";
import { authOptions } from "@/lib/auth";
import { readAdminNotificationPreferences } from "@/services/adminNotificationPreferencesService";

export const metadata = { title: "Admin Settings - Notifications" };

export default async function AdminNotificationSettingsPage() {
  const session = await getServerSession(authOptions);
  const notificationPreferences = session?.user?.id
    ? await readAdminNotificationPreferences(session.user.id)
    : { showAcknowledgedWarnings: true, available: false };

  return (
    <section aria-labelledby="settings-section-title" className="min-w-0">
      <h2 id="settings-section-title" className="text-[16px] font-semibold text-[#020617]">Notifications</h2>
      <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
        Choose how acknowledged warnings appear in your admin notification drawer.
      </p>
      <AdminNotificationPreferencesPanel
        initialValue={notificationPreferences.showAcknowledgedWarnings}
        available={notificationPreferences.available}
      />
    </section>
  );
}
