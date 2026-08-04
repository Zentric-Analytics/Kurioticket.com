import { NextResponse } from "next/server";
import { checkAuthRateLimit, AuthRateLimitError } from "@/lib/auth-rate-limit";
import { writeAdminAuditLog } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";
import { normalizePreviewTesterEmail } from "@/lib/previewTesterAccess";
import { requirePreviewTesterAdmin } from "@/lib/previewTesterAdmin";

export const runtime = "nodejs";
const EMAIL = /^[^\s,@<>]+@[^\s,@<>]+\.[^\s,@<>]+$/;

export async function GET(request: Request) {
  const auth = await requirePreviewTesterAdmin();
  if (auth.response) return auth.response;
  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() || "";
  const testers = await getPrisma().previewTester.findMany({ where: q ? { emailNormalized: { contains: q } } : undefined, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ testers });
}

export async function POST(request: Request) {
  const auth = await requirePreviewTesterAdmin();
  if (auth.response) return auth.response;
  try {
    checkAuthRateLimit({ action: "admin-preview-testers", email: auth.session.user.email || undefined, request, limit: 30, windowMs: 15 * 60_000 });
  } catch (error) {
    if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many changes. Try again later." }, { status: 429 });
    throw error;
  }
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const emailNormalized = normalizePreviewTesterEmail(email);
  if (!EMAIL.test(emailNormalized)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const expiresAt = body.expiresAt ? new Date(String(body.expiresAt)) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return NextResponse.json({ error: "Choose a valid expiration." }, { status: 400 });
  let tester;
  try {
    tester = await getPrisma().previewTester.create({
      data: {
        email, emailNormalized, status: "ACTIVE",
        allowGoogleSignIn: body.allowGoogleSignIn === true,
        allowStagingEmail: body.allowStagingEmail === true,
        expiresAt,
        reason: typeof body.reason === "string" ? body.reason.trim().slice(0, 500) || null : null,
        approvedByAdminId: auth.session.user.id,
        approvedAt: new Date(),
      },
    });
  } catch (error) {
    if (error instanceof Error && /P2002|unique/i.test(error.message)) return NextResponse.json({ error: "That tester already exists." }, { status: 409 });
    throw error;
  }
  await writeAdminAuditLog({ adminUserId: auth.session.user.id, adminEmail: auth.session.user.email, action: "PREVIEW_TESTER_APPROVED", targetType: "PreviewTester", targetId: tester.id, targetEmail: tester.emailNormalized, metadata: { allowGoogleSignIn: tester.allowGoogleSignIn, allowStagingEmail: tester.allowStagingEmail, expiresAt: tester.expiresAt?.toISOString() || null }, request });
  return NextResponse.json({ tester }, { status: 201 });
}
