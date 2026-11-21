/** An unexpired session is not evidence that its device is currently online. */
export type DevicePresenceEvidence = "online" | "offline" | "unavailable";
export type DeviceSessionStatus = "Active" | "Inactive" | "Signed out" | "Expired" | "Unknown";

export function recordedDeviceSessionStatus(
  session: { revokedAt: Date | null; expiresAt: Date },
  now: Date,
  presence: DevicePresenceEvidence,
): DeviceSessionStatus {
  // Explicit sign-out/revocation outranks expiry and retained presence rows.
  if (session.revokedAt) return "Signed out";
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(session.expiresAt.getTime())) return "Unknown";
  if (session.expiresAt.getTime() <= now.getTime()) return "Expired";
  // Only authenticated, recent account-session presence can produce Active.
  if (presence === "online") return "Active";
  if (presence === "offline") return "Inactive";
  return "Unknown";
}

/** Human-readable explanations without exposing raw internal security codes. */
export function recordedDeviceSignOutReason(reason: string | null): string | null {
  if (!reason) return null;
  const labels: Record<string, string> = {
    web_logout: "Signed out from web",
    mobile_logout: "Signed out from mobile",
    user_revoked: "Device session ended",
    sign_out_everywhere: "Signed out everywhere",
    sign_out_other_sessions: "Other devices signed out",
    password_changed_other_device: "Password changed",
    password_reset: "Password reset",
    two_factor_enabled_other_device: "Two-factor authentication enabled",
    two_factor_disabled_other_device: "Two-factor authentication disabled",
    account_suspended: "Account suspended",
    account_deleted: "Account deleted",
  };
  return labels[reason] ?? "Other security action";
}
