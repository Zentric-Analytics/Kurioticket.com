import "server-only";

import { headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

import { getAdminEmails, getAuthSecret } from "@/lib/env";
import { isTrustedPreviewCompanyEmail } from "@/lib/previewTesterAccess";
import { isStagingEnvironment } from "@/lib/stagingSafety";

export type DatabaseOutageAdminToken = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN";
};

function isProtectedAdminEmail(email: string) {
  const normalized = email.toLowerCase().trim();
  return (
    getAdminEmails().includes(normalized) &&
    (!isStagingEnvironment() || isTrustedPreviewCompanyEmail(normalized))
  );
}

/**
 * Emergency read-only identity for the narrow case where the configured
 * database is unavailable and canonical account-session validation cannot run.
 *
 * Callers must independently prove the database is configured but unreachable
 * before using this result. This helper never authorizes mutations.
 */
export async function getDatabaseOutageAdminToken(
  request: NextRequest,
): Promise<DatabaseOutageAdminToken | null> {
  const secret = getAuthSecret();
  if (!secret) return null;

  const token = await getToken({ req: request, secret });
  const id = typeof token?.id === "string" ? token.id : "";
  const email = typeof token?.email === "string" ? token.email.trim().toLowerCase() : "";

  if (
    !id ||
    !email ||
    token?.role !== "ADMIN" ||
    token?.status !== "ACTIVE" ||
    token?.emailVerified !== true ||
    !token?.accountSessionId ||
    (token.twoFactorEnabled === true && token.twoFactorVerified !== true) ||
    !isProtectedAdminEmail(email)
  ) {
    return null;
  }

  return {
    id,
    email,
    name: typeof token.name === "string" ? token.name : null,
    role: "ADMIN",
  };
}

export async function getCurrentDatabaseOutageAdminToken(
  pathname: string,
): Promise<DatabaseOutageAdminToken | null> {
  const requestHeaders = await headers();
  const request = new NextRequest(
    `https://kurioticket.invalid${pathname.startsWith("/") ? pathname : `/${pathname}`}`,
    { headers: new Headers(requestHeaders) },
  );
  return getDatabaseOutageAdminToken(request);
}
