import { createHash, randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/prisma";

export const MOBILE_SESSION_DAYS = 30;

export async function createMobileSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + MOBILE_SESSION_DAYS * 86400000);
  await getPrisma().session.create({ data: { sessionToken: token, userId, expires } });
  return { token, expires: expires.toISOString() };
}

export async function getMobileSession(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  return getPrisma().session.findFirst({
    where: { sessionToken: token, expires: { gt: new Date() } },
    include: { user: { select: { id: true, email: true, name: true, image: true, status: true } } },
  });
}

export function mobileSessionFingerprint(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
