import { getPrisma } from "@/lib/prisma";
import { isStagingEnvironment } from "@/lib/stagingSafety";

const COMPANY_DOMAIN = "zentricanalytics.com";
const EMAIL = /^[^\s,@<>]+@[^\s,@<>]+\.[^\s,@<>]+$/;

export function normalizePreviewTesterEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isCompanyPreviewEmail(email: string) {
  const normalized = normalizePreviewTesterEmail(email);
  return EMAIL.test(normalized) && normalized.endsWith(`@${COMPANY_DOMAIN}`);
}

type TesterRecord = {
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  allowGoogleSignIn: boolean;
  allowStagingEmail: boolean;
  expiresAt: Date | null;
  approvedAt: Date | null;
};

export function isActivePreviewTester(record: TesterRecord | null | undefined, now = new Date()) {
  return Boolean(record?.status === "ACTIVE" && record.approvedAt && (!record.expiresAt || record.expiresAt > now));
}

export function hasPreviewTesterPermission(record: TesterRecord | null | undefined, permission: "google" | "email", now = new Date()) {
  if (!isActivePreviewTester(record, now)) return false;
  return permission === "google" ? Boolean(record?.allowGoogleSignIn) : Boolean(record?.allowStagingEmail);
}

async function findTester(email: string) {
  return getPrisma().previewTester.findUnique({
    where: { emailNormalized: normalizePreviewTesterEmail(email) },
    select: { status: true, allowGoogleSignIn: true, allowStagingEmail: true, expiresAt: true, approvedAt: true },
  });
}

export async function canUseStagingCredentials(email: string) {
  if (!isStagingEnvironment()) return true;
  return isCompanyPreviewEmail(email);
}

export async function canUseStagingGoogle(email: string) {
  if (!isStagingEnvironment()) return true;
  const tester = await findTester(email);
  return hasPreviewTesterPermission(tester, "google");
}

export async function canReceiveStagingEmail(email: string) {
  if (!isStagingEnvironment()) return true;
  if (process.env.STAGING_EMAIL_DELIVERY_ENABLED?.trim().toLowerCase() !== "true") return false;
  if (isCompanyPreviewEmail(email)) return true;
  const tester = await findTester(email);
  return hasPreviewTesterPermission(tester, "email");
}

export async function canRetainStagingSession(email: string, usesGoogle: boolean) {
  if (!isStagingEnvironment()) return true;
  return usesGoogle ? canUseStagingGoogle(email) : canUseStagingCredentials(email);
}
