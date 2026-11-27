import { createHmac } from "node:crypto";
import type { PublicEnvironment } from "./stagingSafety";

/** Staging-only navigation for the current verified roster. No new stored
 * identity, credential or device data. The destination separately requires
 * Admin access, a fresh row and existing ownership proof before history. */
export function adminLiveGuestReference(environment: PublicEnvironment, sourceId: string, secret: string | undefined): string | null {
  if (environment !== "staging" || !secret || secret.length < 32 || !/^[a-f0-9]{64}$/.test(sourceId)) return null;
  return createHmac("sha256", secret)
    .update(JSON.stringify(["admin-live-guest-navigation-v2", environment, sourceId]))
    .digest("base64url");
}
