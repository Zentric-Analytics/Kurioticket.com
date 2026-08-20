import bcrypt from "bcryptjs";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { revokeAllSessions, revokeSession } from "@/lib/account-session";
import { deliverSecurityEvent } from "@/services/securityEventService";

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1), newPassword: z.string().min(8), confirmPassword: z.string().min(8),
}).refine(value => value.newPassword === value.confirmPassword, { path: ["confirmPassword"] })
  .refine(value => value.currentPassword !== value.newPassword, { path: ["newPassword"] });

export async function securityOverview(userId: string) {
  const [user, settings] = await Promise.all([
    getPrisma().user.findUnique({ where: { id: userId }, select: { passwordHash: true } }),
    getPrisma().userSecuritySettings.findUnique({ where: { userId }, select: { twoFactorEnabled: true, securityEmailAlerts: true } }),
  ]);
  if (!user) throw new Error("AccountUnavailable");
  return { hasPassword: Boolean(user.passwordHash), twoFactorEnabled: settings?.twoFactorEnabled ?? false, securityEmailAlerts: settings?.securityEmailAlerts ?? true };
}

export async function saveSecurityAlerts(userId: string, securityEmailAlerts: boolean) {
  return getPrisma().userSecuritySettings.upsert({ where: { userId }, create: { userId, securityEmailAlerts }, update: { securityEmailAlerts }, select: { securityEmailAlerts: true } });
}

export async function activeSecuritySessions(userId: string, currentId: string) {
  const rows = await getPrisma().accountSession.findMany({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" }, select: { id:true, client:true, platform:true, deviceLabel:true, browser:true, os:true, maskedIp:true, lastSeenAt:true } });
  return rows.map(row => ({ ...row, deviceLabel: row.deviceLabel || (row.client === "MOBILE" ? "Mobile device" : "Web browser"), browser: row.browser || (row.client === "MOBILE" ? "Kurioticket app" : "Browser"), os: row.os || row.platform || "Unknown platform", isCurrent: row.id === currentId }));
}

export async function securityActivity(userId: string) {
  return getPrisma().securityEvent.findMany({ where: { userId }, orderBy: { occurredAt: "desc" }, take: 10, select: { id:true, type:true, occurredAt:true, deviceLabel:true } });
}

export async function changePassword(input: { userId: string; email: string; currentSessionId: string; currentPassword: string; newPassword: string }) {
  const user = await getPrisma().user.findUnique({ where: { id: input.userId }, select: { id:true, passwordHash:true, status:true } });
  if (!user || user.status !== "ACTIVE") return "invalid" as const;
  if (!user.passwordHash) return "oauth-only" as const;
  if (!await bcrypt.compare(input.currentPassword, user.passwordHash)) return "invalid" as const;
  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  const event = await getPrisma().$transaction(async tx => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.accountSession.updateMany({ where: { userId: user.id, id: { not: input.currentSessionId }, revokedAt: null }, data: { revokedAt: new Date(), revokeReason: "password_changed_other_device" } });
    return tx.securityEvent.create({ data: { userId: user.id, accountSessionId: input.currentSessionId, type: "PASSWORD_CHANGED" } });
  });
  await deliverSecurityEvent({ userId:user.id, email:input.email, securityEventId:event.id, title:"Password changed", body:"Your Kurioticket password was changed. If this wasn’t you, reset your password and contact Support immediately." });
  return "changed" as const;
}

export { revokeSession };
export async function signOutEverywhere(userId: string, email: string) {
  const event = await revokeAllSessions(userId);
  await deliverSecurityEvent({ userId, email, securityEventId:event.id, title:"Signed out everywhere", body:"All devices were signed out of your Kurioticket account. If this wasn’t you, reset your password immediately." });
}
