import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { checkAuthRateLimit, AuthRateLimitError } from "@/lib/auth-rate-limit";
import { emailSchema } from "@/lib/validation";
import { getPrisma } from "@/lib/prisma";
import { canUseStagingCredentials } from "@/lib/previewTesterAccess";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = emailSchema.safeParse(body?.email);
  const code = String(body?.code || "").trim();
  if (!email.success || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the six-digit code." }, { status: 400 });
  if (!(await canUseStagingCredentials(email.data))) return NextResponse.json({ error: "Preview access is restricted." }, { status: 403 });
  try {
    checkAuthRateLimit({ action: "mobile-verify-code", email: email.data, request, limit: 10, windowMs: 15 * 60_000 });
    const identifier = `email-verification:${email.data}`;
    const token = createHash("sha256").update(`${email.data}:${code}`).digest("hex");
    const verification = await getPrisma().verificationToken.findUnique({ where: { identifier_token: { identifier, token } } });
    if (!verification || verification.expires <= new Date()) {
      return NextResponse.json({ error: "The verification code is incorrect or expired." }, { status: 400 });
    }
    const verificationProof = randomBytes(32).toString("base64url");
    await getPrisma().$transaction([
      getPrisma().verificationToken.deleteMany({ where: { identifier } }),
      getPrisma().verificationToken.deleteMany({ where: { identifier: `mobile-verified:${email.data}` } }),
      getPrisma().verificationToken.create({ data: { identifier: `mobile-verified:${email.data}`, token: verificationProof, expires: new Date(Date.now() + 10 * 60_000) } }),
    ]);
    const user = await getPrisma().user.findUnique({ where: { email: email.data }, select: { passwordHash: true } });
    return NextResponse.json({ ok: true, accountType: user ? "existing" : "new", verificationToken: verificationProof });
  } catch (error) {
    if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many verification attempts. Please wait and try again." }, { status: 429 });
    return NextResponse.json({ error: "Unable to verify the code right now." }, { status: 503 });
  }
}
