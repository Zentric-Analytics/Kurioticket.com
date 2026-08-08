import { getPrisma } from "@/lib/prisma";
import {
  hasTeamAccessCapability,
  normalizeTeamAccessRoles,
  type TeamAccessRole,
} from "@/lib/teamAccessRoles";

export { TEAM_ACCESS_ROLE_DEFINITIONS, TEAM_ACCESS_ROLES, effectiveCapabilities, hasTeamAccessCapability, normalizeTeamAccessRoles } from "@/lib/teamAccessRoles";
export type { TeamAccessCapability, TeamAccessRole } from "@/lib/teamAccessRoles";

export async function getTeamAccessRoles(memberId: string): Promise<TeamAccessRole[]> {
  const member = await getPrisma().previewTester.findUnique({
    where: { id: memberId },
    select: { roles: true },
  });
  return normalizeTeamAccessRoles(member?.roles);
}

export async function getTeamAccessRoleMap(memberIds: string[]) {
  const map = new Map<string, TeamAccessRole[]>();
  if (!memberIds.length) return map;
  const members = await getPrisma().previewTester.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, roles: true },
  });
  for (const member of members) map.set(member.id, normalizeTeamAccessRoles(member.roles));
  return map;
}

export async function setTeamAccessRoles(memberId: string, input: unknown) {
  const roles = normalizeTeamAccessRoles(input);
  await getPrisma().previewTester.update({ where: { id: memberId }, data: { roles } });
  return roles;
}

export async function getBuildNotificationRecipients(platform: "ios" | "android") {
  const requiredRole: TeamAccessRole = "DEVELOPER";
  const capability = platform === "android" ? "ANDROID_BUILD_NOTIFICATIONS" : "IOS_BUILD_NOTIFICATIONS";
  if (!hasTeamAccessCapability([requiredRole], capability)) return [];
  const now = new Date();
  const members = await getPrisma().previewTester.findMany({
    where: {
      status: "ACTIVE",
      approvedAt: { not: null },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      roles: { has: requiredRole },
    },
    orderBy: { emailNormalized: "asc" },
    select: { id: true, email: true, emailNormalized: true, roles: true },
  });
  return members.map((member) => ({ ...member, roles: normalizeTeamAccessRoles(member.roles) }));
}
