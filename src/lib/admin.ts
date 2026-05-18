import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminEmails } from "@/lib/env";
import { logSafeAuthDiagnostics } from "@/lib/auth-diagnostics";
import { getPrisma } from "@/lib/prisma";

type AdminRequest = Request & { headers: Headers };

export async function requireAdminApiSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN" || session.user.status !== "ACTIVE" || !session.user.emailVerified || !isConfiguredAdminEmail(session.user.email)) {
    logSafeAuthDiagnostics("[admin:api-access-denied]", {
      email: session?.user?.email,
      role: session?.user?.role,
      status: session?.user?.status,
    });
    return { response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return { session };
}

export function isConfiguredAdminEmail(email?: string | null) {
  return Boolean(email && getAdminEmails().includes(email.toLowerCase().trim()));
}

export async function countActiveAdminsExcluding(userId: string) {
  return getPrisma().user.count({
    where: {
      id: { not: userId },
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
}

export async function writeAdminAuditLog(input: {
  adminUserId?: string | null;
  adminEmail?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  targetEmail?: string | null;
  metadata?: Record<string, unknown>;
  request?: AdminRequest;
}) {
  try {
    await getPrisma().adminAuditLog.create({
      data: {
        adminUserId: input.adminUserId || undefined,
        adminEmail: input.adminEmail?.toLowerCase() || "unknown-admin",
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId || undefined,
        targetEmail: input.targetEmail?.toLowerCase() || undefined,
        metadata: (input.metadata || {}) as never,
        ipAddress: getRequestIp(input.request),
        userAgent: input.request?.headers.get("user-agent") || undefined,
      },
    });
  } catch (error) {
    console.error("[admin:audit-log]", error);
  }
}

export function getRequestIp(request?: AdminRequest) {
  return (
    request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request?.headers.get("x-real-ip") ||
    undefined
  );
}

export function parsePositiveInt(value: string | null, fallback: number, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}
