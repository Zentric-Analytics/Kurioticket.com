export const TEAM_ACCESS_ROLES = ["TESTER", "DEVELOPER"] as const;
export type TeamAccessRole = (typeof TEAM_ACCESS_ROLES)[number];
export type TeamAccessCapability =
  | "PREVIEW_ACCESS"
  | "GOOGLE_PREVIEW_LOGIN"
  | "STAGING_EMAIL"
  | "ANDROID_BUILD_NOTIFICATIONS"
  | "IOS_BUILD_NOTIFICATIONS";

export const TEAM_ACCESS_ROLE_DEFINITIONS: Record<TeamAccessRole, {
  label: string;
  summary: string;
  capabilities: TeamAccessCapability[];
  grants: string[];
  doesNotGrant: string[];
}> = {
  TESTER: {
    label: "Tester",
    summary: "For people testing Kurioticket Preview before release.",
    capabilities: [
      "PREVIEW_ACCESS",
      "GOOGLE_PREVIEW_LOGIN",
      "STAGING_EMAIL",
      "ANDROID_BUILD_NOTIFICATIONS",
      "IOS_BUILD_NOTIFICATIONS",
    ],
    grants: [
      "Access to the Kurioticket Preview environment",
      "Approved Google sign-in to Preview",
      "Staging and tester email delivery",
      "Android Preview build notifications and verified install links",
      "iOS Preview delivery notifications after verified TestFlight distribution",
    ],
    doesNotGrant: [
      "Production release authority",
      "Kurioticket Admin access",
    ],
  },
  DEVELOPER: {
    label: "Developer",
    summary: "For engineers actively developing and validating Kurioticket.",
    capabilities: [
      "PREVIEW_ACCESS",
      "GOOGLE_PREVIEW_LOGIN",
      "STAGING_EMAIL",
      "ANDROID_BUILD_NOTIFICATIONS",
      "IOS_BUILD_NOTIFICATIONS",
    ],
    grants: [
      "Access to the Kurioticket Preview environment",
      "Approved Google sign-in to Preview",
      "Staging and system email delivery",
      "Android Preview build success and failure notifications",
      "Direct Android APK install link when a Preview build succeeds",
      "iOS Preview build success and failure notifications",
      "TestFlight and build information for successful iOS Preview builds",
    ],
    doesNotGrant: [
      "Kurioticket Admin access",
      "Production deployment authority",
      "Production database access",
      "Apple or Google store-management permissions",
    ],
  },
};

export function normalizeTeamAccessRoles(input: unknown): TeamAccessRole[] {
  if (!Array.isArray(input)) return ["TESTER"];
  const roles = [...new Set(input.filter((value): value is TeamAccessRole =>
    typeof value === "string" && TEAM_ACCESS_ROLES.includes(value as TeamAccessRole),
  ))];
  return roles.length ? roles : ["TESTER"];
}

export function effectiveCapabilities(roles: readonly TeamAccessRole[]) {
  return [...new Set(roles.flatMap((role) => TEAM_ACCESS_ROLE_DEFINITIONS[role].capabilities))];
}

export function hasTeamAccessCapability(roles: readonly TeamAccessRole[] | undefined, capability: TeamAccessCapability) {
  return effectiveCapabilities(roles ?? []).includes(capability);
}
