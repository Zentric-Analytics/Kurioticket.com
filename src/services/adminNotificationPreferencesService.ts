import "server-only";

import { getPrisma } from "@/lib/prisma";

export type AdminNotificationPreferences = {
  showAcknowledgedWarnings: boolean;
};

export type AdminNotificationPreferenceSnapshot = AdminNotificationPreferences & {
  available: boolean;
};

export const DEFAULT_ADMIN_NOTIFICATION_PREFERENCES: AdminNotificationPreferences = {
  showAcknowledgedWarnings: true,
};

export const ADMIN_NOTIFICATION_PREFERENCE_AUDIT_ACTION = "ADMIN_NOTIFICATION_PREFERENCE_UPDATED";

export async function readAdminNotificationPreferences(adminUserId: string): Promise<AdminNotificationPreferenceSnapshot> {
  try {
    const row = await getPrisma().adminNotificationPreference.findUnique({
      where: { adminUserId },
      select: { showAcknowledgedWarnings: true },
    });
    return { showAcknowledgedWarnings: row?.showAcknowledgedWarnings ?? true, available: true };
  } catch (error) {
    console.error("[admin-notification-preferences:read-failed]", error);
    // Do not present an unsaved default as editable configuration.
    return { ...DEFAULT_ADMIN_NOTIFICATION_PREFERENCES, available: false };
  }
}

export async function updateAdminNotificationPreferences(input: {
  adminUserId: string;
  adminEmail: string;
  showAcknowledgedWarnings: boolean;
  reason?: string;
}) {
  const db = getPrisma();
  return db.$transaction(async (tx) => {
    const existing = await tx.adminNotificationPreference.findUnique({
      where: { adminUserId: input.adminUserId },
      select: { showAcknowledgedWarnings: true },
    });
    const previous = existing?.showAcknowledgedWarnings ?? true;
    if (previous === input.showAcknowledgedWarnings) {
      return { showAcknowledgedWarnings: previous, changed: false };
    }
    await tx.adminNotificationPreference.upsert({
      where: { adminUserId: input.adminUserId },
      create: { adminUserId: input.adminUserId, showAcknowledgedWarnings: input.showAcknowledgedWarnings },
      update: { showAcknowledgedWarnings: input.showAcknowledgedWarnings },
    });
    await tx.adminAuditLog.create({
      data: {
        adminUserId: input.adminUserId,
        adminEmail: input.adminEmail,
        action: ADMIN_NOTIFICATION_PREFERENCE_AUDIT_ACTION,
        targetType: "AdminNotificationPreference",
        targetId: input.adminUserId,
        metadata: {
          key: "showAcknowledgedWarnings",
          previous,
          next: input.showAcknowledgedWarnings,
          reason: input.reason ?? null,
        },
      },
    });
    return { showAcknowledgedWarnings: input.showAcknowledgedWarnings, changed: true };
  });
}
