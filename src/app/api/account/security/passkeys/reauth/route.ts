import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { getPrisma } from "@/lib/prisma";
import { verifySecondFactor } from "@/services/twoFactorService";

export const runtime = "nodejs";

const schema = z.object({ code: z.string().trim().optional(), password: z.string().optional() });
const ttlMs = 10 * 60 * 1000;

function hashToken(token: string) { return createHash("sha256").update(`passkey-reauth:${token}`).digest("hex"); }

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try { checkAuthRateLimit({ action: "passkey-reauth", email: session.user.email || undefined, request, limit: 8, windowMs: 15 * 60 * 1000 }); }
  catch (error) { if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 }); throw error; }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter your authenticator code, recovery code, or password." }, { status: 400 });

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true, accounts: { select: { provider: true }, take: 1 }, securitySettings: { select: { twoFactorEnabled: true } } },
  });
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let verified = false;
  if (user.securitySettings?.twoFactorEnabled) {
    verified = Boolean(parsed.data.code && await verifySecondFactor({ userId: session.user.id, code: parsed.data.code, consumeRecoveryCode: false }));
  } else if (user.passwordHash) {
    verified = Boolean(parsed.data.password && await bcrypt.compare(parsed.data.password, user.passwordHash));
  } else {
    return NextResponse.json({ error: "Set up an authenticator app before adding passkeys to this account." }, { status: 409 });
  }

  if (!verified) return NextResponse.json({ error: "Unable to verify that request." }, { status: 400 });

  const token = randomBytes(32).toString("base64url");
  await prisma.verificationToken.create({ data: { identifier: `passkey-reauth:${session.user.id}`, token: hashToken(token), expires: new Date(Date.now() + ttlMs) } });
  return NextResponse.json({ reauthToken: token, expiresAt: new Date(Date.now() + ttlMs).toISOString(), method: user.securitySettings?.twoFactorEnabled ? "totp" : "password" });
}
