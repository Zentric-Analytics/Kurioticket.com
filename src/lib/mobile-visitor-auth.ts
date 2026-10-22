import { getMobileSession } from "@/lib/mobile-auth";

/** A native visitor may be anonymous; account linking requires the complete bearer boundary. */
export async function resolveMobileVisitorAccount(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE" || !session.user.emailVerified) return null;
  return { userId: session.user.id };
}
