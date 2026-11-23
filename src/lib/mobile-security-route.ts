import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";

export async function requireMobileSecurity(request: Request, authenticate = getMobileSession) {
  const session = await authenticate(request);
  if (!session || session.user.status !== "ACTIVE" || !session.user.emailVerified) return null;

  const email = session.user.email;
  if (!email) return null;

  return { ...session, user: { ...session.user, email } };
}
export const mobileUnauthorized = () => NextResponse.json({ error: "Authentication required." }, { status: 401 });
