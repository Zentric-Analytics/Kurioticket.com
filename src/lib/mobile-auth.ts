import { createHash, randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { canRetainStagingSession } from "@/lib/previewTesterAccess";

export const MOBILE_SESSION_DAYS = 30;

export async function createMobileSession(userId: string, authMethod: "credentials" | "google" = "credentials") {
  const token = `${authMethod === "google" ? "g" : "c"}.${randomBytes(32).toString("base64url")}`;
  const expires = new Date(Date.now() + MOBILE_SESSION_DAYS * 86400000);
  await getPrisma().session.create({ data: { sessionToken: token, userId, expires } });
  return { token, expires: expires.toISOString() };
}

export async function getMobileSession(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const session = await getPrisma().session.findFirst({
    where: { sessionToken: token, expires: { gt: new Date() } },
    include: { user: { select: { id: true, email: true, name: true, image: true, status: true, accounts: { select: { provider: true } } } } },
  });
  if (!session?.user.email) return session;
  const allowed = await canRetainStagingSession(session.user.email, token.startsWith("g."));
  if (!allowed) return null;
  return session;
}

export function mobileSessionFingerprint(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
