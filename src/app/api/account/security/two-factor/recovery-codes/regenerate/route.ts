import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { getTwoFactorStatus, regenerateRecoveryCodes } from "@/services/twoFactorService";
import { deliverSecurityEvent } from "@/services/securityEventService";
export const runtime = "nodejs";
const schema = z.object({ code: z.string().min(6).max(64) });
export async function POST(request: Request) {
 const auth = await requireWebApiSession();
 if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
 try { checkAuthRateLimit({ action: "two-factor-regenerate", email: auth.session.user.email || undefined, request, limit: 5, windowMs: 15 * 60 * 1000 }); }
 catch (error) { if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 }); throw error; }
 const parsed = schema.safeParse(await request.json().catch(() => ({})));
 if (!parsed.success) return NextResponse.json({ error: "Enter an authenticator or recovery code." }, { status: 400 });
 const result = await regenerateRecoveryCodes({ userId: auth.userId, accountSessionId: auth.accountSession.id, code: parsed.data.code });
 if (!result) return NextResponse.json({ error: "The security code is invalid." }, { status: 403 });
 await deliverSecurityEvent({ userId: auth.userId, email: auth.session.user.email, securityEventId: result.securityEvent.id, title: "Recovery codes regenerated", body: "New two-factor recovery codes were generated. Previous recovery codes no longer work. If this wasn’t you, secure your account immediately." });
 return NextResponse.json({ ok: true, twoFactor: await getTwoFactorStatus(auth.userId), recoveryCodes: result.recoveryCodes });
}
