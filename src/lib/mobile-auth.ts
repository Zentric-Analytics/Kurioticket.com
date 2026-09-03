import { createHash } from "node:crypto";
import { issueMobileSession, MOBILE_SESSION_DAYS, validateMobileBearer } from "@/lib/account-session";

export { MOBILE_SESSION_DAYS };
export type MobileSessionMetadata = { platform?: "ios" | "android"; appVersion?: string };
export function mobileSessionMetadata(request: Request): MobileSessionMetadata {
  const platform = request.headers.get("x-mobile-platform")?.trim().toLowerCase();
  const appVersion = request.headers.get("x-mobile-app-version")?.trim();
  return {
    ...(platform === "ios" || platform === "android" ? { platform } : {}),
    ...(appVersion && appVersion.length <= 32 && /^[0-9A-Za-z][0-9A-Za-z.+_-]*$/.test(appVersion) ? { appVersion } : {}),
  };
}
export async function createMobileSession(userId: string, authMethod: "credentials" | "google" = "credentials", assurance: "PRIMARY" | "MFA" = "PRIMARY", metadata?: MobileSessionMetadata) {
  return issueMobileSession(userId, authMethod === "google" ? "GOOGLE" : "PASSWORD", assurance, metadata);
}
export const getMobileSession = validateMobileBearer;
export function mobileSessionFingerprint(token: string) { return createHash("sha256").update(token).digest("hex"); }
// Legacy rows used authMethod === "google" ? "g" : "c"; the forward migration removes them.
