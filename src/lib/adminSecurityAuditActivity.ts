import type { Prisma } from "@/generated/prisma/client";
import type { ActivityRow } from "./adminIdentityJourney";
import type { PublicEnvironment } from "./stagingSafety";

// Each existing audit action is written after its security mutation succeeds.
// The unified history receives a fixed label and source timestamp only.
const actions = [
  { action: "USER_ROLE_UPDATED", targetType: "User", label: "Updated account role" },
  { action: "USER_SUSPENDED", targetType: "User", label: "Suspended account" },
  { action: "USER_REACTIVATED", targetType: "User", label: "Reactivated account" },
  { action: "USER_SOFT_DELETED", targetType: "User", label: "Deleted account" },
  { action: "USER_HARD_DELETED", targetType: "User", label: "Permanently deleted account" },
  { action: "TEAM_ACCESS_MEMBER_APPROVED", targetType: "PreviewTester", label: "Approved team access" },
  { action: "TEAM_ACCESS_UPDATE", targetType: "PreviewTester", label: "Updated team access" },
  { action: "TEAM_ACCESS_REACTIVATE", targetType: "PreviewTester", label: "Reactivated team access" },
  { action: "TEAM_ACCESS_SUSPEND", targetType: "PreviewTester", label: "Suspended team access" },
  { action: "TEAM_ACCESS_REVOKE", targetType: "PreviewTester", label: "Revoked team access" },
] as const;

export function isProjectableAdminSecurityAudit(action: string, targetType: string) {
  return actions.some(entry => entry.action === action && entry.targetType === targetType);
}

export function adminSecurityAuditActivityWhere(actorId: string, environment: PublicEnvironment, createdAt: Prisma.DateTimeFilter, query: string): Prisma.AdminAuditLogWhereInput {
  const q = query.toLowerCase();
  return {
    adminUserId: actorId,
    createdAt,
    metadata: { path: ["environment"], equals: environment },
    OR: actions.filter(entry => !q || entry.label.toLowerCase().includes(q) || "administrative security audit".includes(q))
      .map(({ action, targetType }) => ({ action, targetType })),
  };
}

export function toAdminSecurityAuditActivity(row: { id: string; action: string; targetType: string; createdAt: Date }): ActivityRow | null {
  const entry = actions.find(entry => entry.action === row.action && entry.targetType === row.targetType);
  return entry ? {
    id: "a-" + row.id,
    at: row.createdAt,
    stage: "ADMIN_SECURITY_AUDIT",
    interface: "admin",
    originalIdentity: "administrator",
    outcome: "succeeded",
    label: entry.label,
    detail: "Administrative security audit",
  } : null;
}
