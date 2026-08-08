import { NextResponse } from "next/server";
import { checkAuthRateLimit, AuthRateLimitError } from "@/lib/auth-rate-limit";
import { writeAdminAuditLog } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";
import { requirePreviewTesterAdmin } from "@/lib/previewTesterAdmin";
import { getTeamAccessRoles, normalizeTeamAccessRoles, setTeamAccessRoles } from "@/lib/teamAccess";

type Context = { params: Promise<{ id: string }> };
const actions = ["reactivate", "suspend", "revoke", "update"] as const;

export async function PATCH(request: Request, context: Context) {
  const auth = await requirePreviewTesterAdmin();
  if (auth.response) return auth.response;
  try {
    checkAuthRateLimit({ action: "admin-team-access", email: auth.session.user.email || undefined, request, limit: 30, windowMs: 15 * 60_000 });
  } catch (error) {
    if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many changes. Try again later." }, { status: 429 });
    throw error;
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action || "") as typeof actions[number];
  if (!actions.includes(action)) return NextResponse.json({ error: "Choose a valid action." }, { status: 400 });
  const previous = await getPrisma().previewTester.findUnique({ where: { id } });
  if (!previous) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  const previousRoles = await getTeamAccessRoles(id);
  const expectedUpdatedAt = new Date(String(body.updatedAt || ""));
  if (Number.isNaN(expectedUpdatedAt.getTime())) return NextResponse.json({ error: "Refresh the team list and try again." }, { status: 409 });
  const now = new Date();
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) || null : undefined;
  const expiresAt = body.expiresAt === null || body.expiresAt === "" ? null : body.expiresAt ? new Date(String(body.expiresAt)) : undefined;
  if (expiresAt instanceof Date && Number.isNaN(expiresAt.getTime())) return NextResponse.json({ error: "Choose a valid expiration." }, { status: 400 });
  const updateResult = await getPrisma().previewTester.updateMany({
    where: { id, updatedAt: expectedUpdatedAt },
    data: action === "update"
      ? { allowGoogleSignIn: true, allowStagingEmail: true, expiresAt, reason }
      : action === "reactivate"
      ? { status: "ACTIVE", approvedByAdminId: auth.session.user.id, approvedAt: now, suspendedByAdminId: null, suspendedAt: null, revokedByAdminId: null, revokedAt: null }
      : action === "suspend"
        ? { status: "SUSPENDED", suspendedByAdminId: auth.session.user.id, suspendedAt: now, reason }
        : { status: "REVOKED", revokedByAdminId: auth.session.user.id, revokedAt: now, reason },
  });
  if (updateResult.count !== 1) return NextResponse.json({ error: "This team member changed. Refresh and try again." }, { status: 409 });
  let roles = previousRoles;
  if (action === "update") roles = await setTeamAccessRoles(id, normalizeTeamAccessRoles(body.roles));
  const tester = await getPrisma().previewTester.findUniqueOrThrow({ where: { id } });
  if (action === "suspend" || action === "revoke") {
    const user = await getPrisma().user.findUnique({ where: { email: tester.emailNormalized }, select: { id: true } });
    if (user) await getPrisma().userSessionActivity.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } });
  }
  await writeAdminAuditLog({
    adminUserId: auth.session.user.id,
    adminEmail: auth.session.user.email,
    action: `TEAM_ACCESS_${action.toUpperCase()}`,
    targetType: "PreviewTester",
    targetId: tester.id,
    targetEmail: tester.emailNormalized,
    metadata: { previousStatus: previous.status, nextStatus: tester.status, previousRoles, nextRoles: roles, reason: reason ?? tester.reason },
    request,
  });
  return NextResponse.json({ tester: { ...tester, roles } });
}
