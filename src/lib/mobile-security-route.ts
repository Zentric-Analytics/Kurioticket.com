import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";

export async function requireMobileSecurity(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE" || !session.user.emailVerified) return null;
  return session;
}
export const mobileUnauthorized = () => NextResponse.json({ error: "Authentication required." }, { status: 401 });
