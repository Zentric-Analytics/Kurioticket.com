import { getPrisma } from "@/lib/prisma";
import { isStagingEnvironment } from "@/lib/stagingSafety";
import { hasTeamAccessCapability, normalizeTeamAccessRoles, type TeamAccessRole } from "@/lib/teamAccessRoles";

export const TRUSTED_PREVIEW_DOMAINS = new Set([
  "kurioticket.com",
  "zentricanalytics.com",
]);
const EMAIL = /^[^\s,@<>]+@[^\s,@<>]+\.[^\s,@<>]+$/;

export function normalizePreviewTesterEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isTrustedPreviewCompanyEmail(email: string) {
  const normalized = normalizePreviewTesterEmail(email);
  if (!EMAIL.test(normalized)) return false;
  const separator = normalized.lastIndexOf("@");
  return separator > 0 && TRUSTED_PREVIEW_DOMAINS.has(normalized.slice(separator + 1));
}

/** @deprecated Use isTrustedPreviewCompanyEmail. */
export const isCompanyPreviewEmail = isTrustedPreviewCompanyEmail;

type TesterRecord = {
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  allowGoogleSignIn: boolean;
  allowStagingEmail: boolean;
  expiresAt: Date | null;
  approvedAt: Date | null;
  roles?: TeamAccessRole[];
};

export function isActivePreviewTester(record: TesterRecord | null | undefined, now = new Date()) {
  return Boolean(record?.status === "ACTIVE" && record.approvedAt && (!record.expiresAt || record.expiresAt > now));
}

export function hasPreviewTesterPermission(record: TesterRecord | null | undefined, permission: "google" | "email", now = new Date()) {
  if (!isActivePreviewTester(record, now)) return false;
  const roles = record?.roles ?? [];
  if (roles.length) {
    return permission === "google"
      ? hasTeamAccessCapability(roles, "GOOGLE_PREVIEW_LOGIN")
      : hasTeamAccessCapability(roles, "STAGING_EMAIL");
  }
  return permission === "google" ? Boolean(record?.allowGoogleSignIn) : Boolean(record?.allowStagingEmail);
}

export function isStagingGoogleAccessAllowed(
  email: string,
  googleEmailVerified: boolean,
  tester: TesterRecord | null | undefined,
) {
  if (isTrustedPreviewCompanyEmail(email)) return googleEmailVerified;
  return googleEmailVerified && hasPreviewTesterPermission(tester, "google");
}

export function isStagingEmailRecipientAllowed(
  email: string,
  tester: TesterRecord | null | undefined,
) {
  return isTrustedPreviewCompanyEmail(email) || hasPreviewTesterPermission(tester, "email");
}

export async function findTester(email: string) {
  const tester = await getPrisma().previewTester.findUnique({
    where: { emailNormalized: normalizePreviewTesterEmail(email) },
    select: {
      status: true,
      allowGoogleSignIn: true,
      allowStagingEmail: true,
      expiresAt: true,
      approvedAt: true,
      roles: true,
    },
  });
  return tester ? { ...tester, roles: normalizeTeamAccessRoles(tester.roles) } : null;
}

export async function canUseStagingCredentials(
  email: string,
  lookupTester: (email: string) => Promise<TesterRecord | null> = findTester,
) {
  if (!isStagingEnvironment()) return true;
  if (isTrustedPreviewCompanyEmail(email)) return isStagingEmailRecipientAllowed(email, null);
  if (!EMAIL.test(normalizePreviewTesterEmail(email))) return false;
  const tester = await lookupTester(normalizePreviewTesterEmail(email));
  return isStagingEmailRecipientAllowed(email, tester);
}

export async function canUseStagingGoogle(email: string, googleEmailVerified?: boolean) {
  if (!isStagingEnvironment()) return true;
  const verified = googleEmailVerified !== false;
  if (isTrustedPreviewCompanyEmail(email)) {
    return isStagingGoogleAccessAllowed(email, verified, null);
  }
  const tester = await findTester(email);
  return isStagingGoogleAccessAllowed(email, verified, tester);
}

export async function canReceiveStagingEmail(email: string) {
  if (!isStagingEnvironment()) return true;
  if (process.env.STAGING_EMAIL_DELIVERY_ENABLED?.trim().toLowerCase() !== "true") return false;
  if (isTrustedPreviewCompanyEmail(email)) return isStagingEmailRecipientAllowed(email, null);
  const tester = await findTester(email);
  return isStagingEmailRecipientAllowed(email, tester);
}

export async function canRetainStagingSession(email: string, usesGoogle: boolean) {
  if (!isStagingEnvironment()) return true;
  return usesGoogle ? canUseStagingGoogle(email) : canUseStagingCredentials(email);
}
