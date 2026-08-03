import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { checkAuthRateLimit, AuthRateLimitError } from "@/lib/auth-rate-limit";
import { signinSchema } from "@/lib/validation";
import { getPrisma } from "@/lib/prisma";
import { createMobileSession } from "@/lib/mobile-auth";
import { canUseStagingCredentials } from "@/lib/previewTesterAccess";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signinSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check your password and try again." }, { status: 400 });
  if (!(await canUseStagingCredentials(parsed.data.email))) return NextResponse.json({ error: "Preview access is restricted." }, { status: 403 });
  try {
    checkAuthRateLimit({ action: "mobile-password", email: parsed.data.email, request, limit: 8, windowMs: 15 * 60_000 });
    const user = await getPrisma().user.findUnique({ where: { email: parsed.data.email } });
    if (!user?.passwordHash || user.status !== "ACTIVE" || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Check your password and try again." }, { status: 401 });
    }
    const session = await createMobileSession(user.id);
    return NextResponse.json({ session, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 });
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 503 });
  }
}
