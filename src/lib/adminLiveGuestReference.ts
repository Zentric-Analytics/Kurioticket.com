import { createHmac } from "node:crypto";
import type { PublicEnvironment } from "./stagingSafety";

/** Staging-only navigation for the current verified roster. No new stored
 * identity, credential, device data or link to historical activity. The
 * destination must separately require Admin access and a fresh guest row. */
export function adminLiveGuestReference(environment: PublicEnvironment, sourceId: string, secret: string | undefined): string | null {
  if (environment !== "staging" || !secret || secret.length < 32 || !/^[a-f0-9]{64}$/.test(sourceId)) return null;
  return createHmac("sha256", secret)
    .update(JSON.stringify(["admin-live-guest-navigation-v2", environment, sourceId]))
    .digest("base64url");
}
