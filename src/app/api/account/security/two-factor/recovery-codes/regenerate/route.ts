import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { getTwoFactorStatus, regenerateRecoveryCodes } from "@/services/twoFactorService";
export const runtime = "nodejs";
const schema = z.object({ code: z.string().regex(/^\d{6}$/) });
export async function POST(request: Request) {
 const session = await getServerSession(authOptions);
 if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
 try { checkAuthRateLimit({ action: "two-factor-regenerate", email: session.user.email || undefined, request, limit: 5, windowMs: 15 * 60 * 1000 }); }
 catch (error) { if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 }); throw error; }
 const parsed = schema.safeParse(await request.json().catch(() => ({})));
 if (!parsed.success) return NextResponse.json({ error: "Enter the 6-digit authenticator code." }, { status: 400 });
 const recoveryCodes = await regenerateRecoveryCodes({ userId: session.user.id, code: parsed.data.code });
 if (!recoveryCodes) return NextResponse.json({ error: "The authenticator code is invalid." }, { status: 400 });
 return NextResponse.json({ ok: true, twoFactor: await getTwoFactorStatus(session.user.id), recoveryCodes });
}
