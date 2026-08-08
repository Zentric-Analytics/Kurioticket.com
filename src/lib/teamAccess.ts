import { getPrisma } from "@/lib/prisma";
import {
  hasTeamAccessCapability,
  normalizeTeamAccessRoles,
  type TeamAccessRole,
} from "@/lib/teamAccessRoles";

export { TEAM_ACCESS_ROLE_DEFINITIONS, TEAM_ACCESS_ROLES, effectiveCapabilities, hasTeamAccessCapability, normalizeTeamAccessRoles } from "@/lib/teamAccessRoles";
export type { TeamAccessCapability, TeamAccessRole } from "@/lib/teamAccessRoles";

export async function getTeamAccessRoles(memberId: string): Promise<TeamAccessRole[]> {
  const rows = await getPrisma().$queryRaw<Array<{ roles: string[] }>>`
    SELECT "roles" FROM "PreviewTester" WHERE "id" = ${memberId} LIMIT 1
  `;
  return normalizeTeamAccessRoles(rows[0]?.roles);
}

export async function getTeamAccessRoleMap(memberIds: string[]) {
  const map = new Map<string, TeamAccessRole[]>();
  await Promise.all(memberIds.map(async (memberId) => {
    map.set(memberId, await getTeamAccessRoles(memberId));
  }));
  return map;
}

export async function setTeamAccessRoles(memberId: string, input: unknown) {
  const roles = normalizeTeamAccessRoles(input);
  await getPrisma().$executeRaw`
    UPDATE "PreviewTester" SET "roles" = ${roles}::text[], "updatedAt" = NOW() WHERE "id" = ${memberId}
  `;
  return roles;
}

export async function getBuildNotificationRecipients(platform: "ios" | "android") {
  const requiredRole: TeamAccessRole = "DEVELOPER";
  const capability = platform === "android" ? "ANDROID_BUILD_NOTIFICATIONS" : "IOS_BUILD_NOTIFICATIONS";
  if (!hasTeamAccessCapability([requiredRole], capability)) return [];
  const rows = await getPrisma().$queryRaw<Array<{ id: string; email: string; emailNormalized: string; roles: string[] }>>`
    SELECT "id", "email", "emailNormalized", "roles"
    FROM "PreviewTester"
    WHERE "status" = 'ACTIVE'
      AND "approvedAt" IS NOT NULL
      AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
      AND ${requiredRole} = ANY("roles")
    ORDER BY "emailNormalized" ASC
  `;
  return rows.map((row) => ({ ...row, roles: normalizeTeamAccessRoles(row.roles) }));
}
