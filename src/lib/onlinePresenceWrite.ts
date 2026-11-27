import type { Prisma } from "@/generated/prisma/client";
import type { OnlinePresenceHeartbeat } from "./onlinePresenceRoute";

const writeThrottleMs = 20_000;

/** Canonical presence remains writable during an optional schema/lookup error.
 * Forced renewal invalidates any optional tuple tied to the older observation. */
export async function writeOnlinePresence(
  db: Prisma.TransactionClient,
  { environment, sourceId, platform, accountSessionId, now }: OnlinePresenceHeartbeat,
  invalidateOptionalObservation = false,
) {
  const writeBefore = new Date(+now - writeThrottleMs);
  return db.$executeRaw`
    INSERT INTO "OnlinePresenceSession" AS current
      ("environment", "sourceId", "platform", "accountSessionId", "lastSeenAt")
    VALUES (${environment}, ${sourceId}, ${platform}, ${accountSessionId}, ${now})
    ON CONFLICT ("environment", "sourceId") DO UPDATE SET
      "platform" = EXCLUDED."platform",
      "accountSessionId" = EXCLUDED."accountSessionId",
      -- On an equal-time optional failure, advance one millisecond so the
      -- previous optional tuple cannot still equal the accepted observation.
      -- The WHERE clause retains account precedence and rejects older writes.
      "lastSeenAt" = CASE WHEN ${invalidateOptionalObservation} AND current."lastSeenAt" = EXCLUDED."lastSeenAt"
        THEN EXCLUDED."lastSeenAt" + INTERVAL '1 millisecond' ELSE EXCLUDED."lastSeenAt" END
    WHERE (current."lastSeenAt" < EXCLUDED."lastSeenAt"
      OR (current."lastSeenAt" = EXCLUDED."lastSeenAt"
        AND ((current."accountSessionId" IS NULL AND EXCLUDED."accountSessionId" IS NOT NULL)
          OR (${invalidateOptionalObservation} AND current."accountSessionId" IS NOT DISTINCT FROM EXCLUDED."accountSessionId"))))
      AND (${invalidateOptionalObservation} OR current."lastSeenAt" <= ${writeBefore}
        OR current."accountSessionId" IS DISTINCT FROM EXCLUDED."accountSessionId"
        OR current."platform" IS DISTINCT FROM EXCLUDED."platform")
  `;
}
