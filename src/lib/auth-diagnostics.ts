import { getAdminEmails } from "@/lib/env";
import { isDatabaseConfigured } from "@/lib/prisma";

export function isGoogleAuthConfigured() {
  return Boolean(process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim());
}

export function getSafeAuthDiagnostics(input?: { email?: string | null; role?: string | null; status?: string | null }) {
  return {
    databaseConfigured: isDatabaseConfigured(),
    googleConfigured: isGoogleAuthConfigured(),
    adminEmailCount: getAdminEmails().length,
    sessionEmail: input?.email?.toLowerCase() || null,
    sessionRole: input?.role || null,
    userStatus: input?.status || null,
  };
}

export function logSafeAuthDiagnostics(label: string, input?: { email?: string | null; role?: string | null; status?: string | null }) {
  console.error(label, getSafeAuthDiagnostics(input));
}
