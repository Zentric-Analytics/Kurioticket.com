import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateAccountSession } from "@/lib/account-session";

/** Authoritative database-backed boundary. Middleware is only an early UX aid. */
export async function requireWebApiSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.accountSessionId || session.user.status !== "ACTIVE" || !session.user.emailVerified) return null;
  if (session.user.twoFactorEnabled && !session.user.twoFactorVerified) return null;
  const accountSession = await validateAccountSession(session.user.accountSessionId, session.user.id);
  if (!accountSession) return null;
  return { session, accountSession, userId: session.user.id };
}
