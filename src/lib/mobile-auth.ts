import { createHash } from "node:crypto";
import { issueMobileSession, MOBILE_SESSION_DAYS, validateMobileBearer } from "@/lib/account-session";

export { MOBILE_SESSION_DAYS };
export async function createMobileSession(userId: string, authMethod: "credentials" | "google" = "credentials", assurance: "PRIMARY" | "MFA" = "PRIMARY") {
  return issueMobileSession(userId, authMethod === "google" ? "GOOGLE" : "PASSWORD", assurance);
}
export const getMobileSession = validateMobileBearer;
export function mobileSessionFingerprint(token: string) { return createHash("sha256").update(token).digest("hex"); }
// Legacy rows used authMethod === "google" ? "g" : "c"; the forward migration removes them.
