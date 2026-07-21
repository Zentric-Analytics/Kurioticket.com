import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { createTotpSetup } from "@/services/twoFactorService";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try { checkAuthRateLimit({ action: "two-factor-setup", email: session.user.email || undefined, request, limit: 5, windowMs: 15 * 60 * 1000 }); }
  catch (error) { if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many setup attempts. Please wait and try again." }, { status: 429 }); throw error; }
  const setup = await createTotpSetup({ userId: session.user.id, email: session.user.email });
  return NextResponse.json({ setup });
}
