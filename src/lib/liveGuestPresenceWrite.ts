import type { Prisma } from "@/generated/prisma/client";
import type { OnlinePresenceHeartbeat } from "./onlinePresenceRoute";
import { guestFirstAccessPreviewEnabled } from "./guestFirstAccessObservation";
import { guestLiveCountryEnabled, safeGuestLiveCountry } from "./guestLiveCountry";
import { onlinePresenceWindowSeconds } from "./onlinePresence";
const writeThrottleMs = 20_000;

/** Atomically tie optional country/device fields to the accepted heartbeat.
 * Account transitions clear guest fields; older writes cannot restore them.
 * Never use the legacy preview's less strictly verified country. */
export async function writeGuestPresenceDetails(db: Prisma.TransactionClient, heartbeat: OnlinePresenceHeartbeat) {
  const { environment, sourceId, platform, now, accountSessionId } = heartbeat;
  const preview = accountSessionId === null && guestFirstAccessPreviewEnabled(environment) ? heartbeat.guestAccess : undefined;
  const country = accountSessionId === null && guestLiveCountryEnabled(environment)
    ? safeGuestLiveCountry(heartbeat.guestLiveCountryCode) : null;
  const writeBefore = new Date(+now - writeThrottleMs);
  const liveCutoff = new Date(+now - onlinePresenceWindowSeconds * 1000);
  return db.$executeRaw`
    INSERT INTO "OnlinePresenceSession" AS current
      ("environment", "sourceId", "platform", "accountSessionId", "lastSeenAt",
       "guestFirstSeenAt", "guestObservedAt", "guestCountryCode", "guestDeviceLabel", "guestBrowser", "guestOs",
       "guestLiveCountryCode", "guestLiveCountryObservedAt")
    VALUES (${environment}, ${sourceId}, ${platform}, ${accountSessionId}, ${now},
       ${preview ? now : null}, ${preview ? now : null}, NULL, ${preview?.deviceLabel ?? null},
       ${preview?.browser ?? null}, ${preview?.os ?? null}, ${country}, ${country ? now : null})
    ON CONFLICT ("environment", "sourceId") DO UPDATE SET
      "platform" = EXCLUDED."platform",
      "accountSessionId" = EXCLUDED."accountSessionId",
      "lastSeenAt" = EXCLUDED."lastSeenAt",
      "guestFirstSeenAt" = CASE WHEN EXCLUDED."guestFirstSeenAt" IS NOT NULL
        AND current."accountSessionId" IS NULL
        AND current."lastSeenAt" > ${liveCutoff}
        AND current."guestObservedAt" = current."lastSeenAt"
        AND current."guestFirstSeenAt" <= current."lastSeenAt"
        THEN current."guestFirstSeenAt" ELSE EXCLUDED."guestFirstSeenAt" END,
      "guestObservedAt" = EXCLUDED."guestObservedAt",
      "guestCountryCode" = NULL,
      "guestDeviceLabel" = EXCLUDED."guestDeviceLabel",
      "guestBrowser" = EXCLUDED."guestBrowser",
      "guestOs" = EXCLUDED."guestOs",
      "guestLiveCountryCode" = EXCLUDED."guestLiveCountryCode",
      "guestLiveCountryObservedAt" = EXCLUDED."guestLiveCountryObservedAt"
    WHERE current."lastSeenAt" <= EXCLUDED."lastSeenAt"
      AND (current."lastSeenAt" <= ${writeBefore}
        OR current."accountSessionId" IS DISTINCT FROM EXCLUDED."accountSessionId"
        OR current."platform" IS DISTINCT FROM EXCLUDED."platform")
  `;
}

