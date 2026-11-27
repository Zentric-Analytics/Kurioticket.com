import { Prisma } from "@/generated/prisma/client";
import { adminLiveGuestReference } from "./adminLiveGuestReference";
import type { OnlineIdentityRow } from "./adminOnlineUsersSnapshot";
import { safeGuestPresenceActivityIdentity, type GuestPresenceActivityIdentity } from "./guestPresenceActivityIdentity";
import { onlinePresenceWindowSeconds, type OnlinePresencePlatform } from "./onlinePresence";
import type { PublicEnvironment } from "./stagingSafety";

export type LiveGuestHistoryCandidate = {
  sourceId: string;
  platform: OnlinePresencePlatform;
  lastSeenAt: Date;
  guestActivityKind: string | null;
  guestActivityId: string | null;
  guestActivityObservedAt: Date | null;
  guestActivityExpiresAt: Date | null;
};

export const liveGuestHistoryCandidateLimit = 20000;

type HistoryDependencies = {
  readCandidates: (at: Date) => Promise<LiveGuestHistoryCandidate[]>;
  targetEligible: (candidate: LiveGuestHistoryCandidate, identity: GuestPresenceActivityIdentity, at: Date) => Promise<boolean>;
  clock: () => Date;
};

/** Re-evaluate the live lease after both asynchronous reads. A slow database
 * must not extend the presence window or a credential's signed expiry. */
export async function resolveVerifiedLiveGuestHistory(
  row: OnlineIdentityRow, environment: PublicEnvironment, now: Date,
  secret: string | undefined, dependencies: HistoryDependencies,
): Promise<{ kind: "visitor" | "operational"; id: string } | null> {
  if (environment !== "staging" || row.kind !== "guest" || !row.liveReference || !secret) return null;
  const currentTime = () => new Date(Math.max(+now, +dependencies.clock()));
  const candidates = await dependencies.readCandidates(currentTime());
  const readAt = currentTime();
  const match = matchLiveGuestHistory(row, candidates, environment, readAt, secret);
  if (!match || !await dependencies.targetEligible(match.candidate, match.identity, readAt)) return null;
  if (!matchLiveGuestHistory(row, [match.candidate], environment, currentTime(), secret)) return null;
  return { kind: match.identity.kind, id: match.identity.id };
}

/** Match the opaque navigation reference, never a country/device or roster ID.
 * Optional ownership data stays entirely server-side. */
export function matchLiveGuestHistory(
  row: OnlineIdentityRow, candidates: LiveGuestHistoryCandidate[],
  environment: PublicEnvironment, now: Date, secret: string | undefined,
): { candidate: LiveGuestHistoryCandidate; identity: GuestPresenceActivityIdentity } | null {
  if (environment !== "staging" || row.kind !== "guest" || !row.liveReference
      || candidates.length > liveGuestHistoryCandidateLimit || !Number.isFinite(+now)) return null;
  const lastSeen = Date.parse(row.lastSeenAt);
  const cutoff = +now - onlinePresenceWindowSeconds * 1000;
  if (!Number.isFinite(lastSeen) || lastSeen <= cutoff || lastSeen > +now) return null;
  const matches = candidates.filter(candidate => adminLiveGuestReference(environment, candidate.sourceId, secret) === row.liveReference);
  if (matches.length !== 1) return null;
  const candidate = matches[0];
  if (!["desktop_web", "mobile_web", "ios", "android"].includes(candidate.platform)
      || !(candidate.lastSeenAt instanceof Date) || +candidate.lastSeenAt !== lastSeen
      || !candidate.guestActivityObservedAt || +candidate.guestActivityObservedAt !== lastSeen
      || !row.platforms.includes(candidate.platform)) return null;
  const identity = safeGuestPresenceActivityIdentity({
    kind: candidate.guestActivityKind,
    id: candidate.guestActivityId,
    expiresAt: candidate.guestActivityExpiresAt,
  } as GuestPresenceActivityIdentity, environment, now);
  return identity ? { candidate, identity } : null;
}

export function liveGuestHistoryCandidatesSql(environment: PublicEnvironment, now: Date) {
  const cutoff = new Date(+now - onlinePresenceWindowSeconds * 1000);
  return Prisma.sql`
    SELECT "sourceId", "platform", "lastSeenAt", "guestActivityKind", "guestActivityId",
      "guestActivityObservedAt", "guestActivityExpiresAt"
    FROM "OnlinePresenceSession"
    WHERE "environment" = ${environment} AND "accountSessionId" IS NULL
      AND "platform" IN ('desktop_web', 'mobile_web', 'ios', 'android')
      AND "lastSeenAt" > ${cutoff} AND "lastSeenAt" <= ${now}
      AND "guestActivityObservedAt" = "lastSeenAt" AND "guestActivityExpiresAt" > ${now}
    ORDER BY "lastSeenAt" DESC, "sourceId" ASC
    LIMIT ${liveGuestHistoryCandidateLimit + 1}
  `;
}

/** Recheck current presence and current owner eligibility in one statement.
 * Operational guests need an actual matching web/native recorded observation;
 * they cannot be reinterpreted as visitors, accounts, bots, or another source. */
export function liveGuestHistoryTargetSql(
  candidate: LiveGuestHistoryCandidate, identity: GuestPresenceActivityIdentity,
  environment: PublicEnvironment, now: Date,
) {
  const cutoff = new Date(+now - onlinePresenceWindowSeconds * 1000);
  const applicationSource = candidate.platform === "ios" ? "IOS" : candidate.platform === "android" ? "ANDROID" : "WEB";
  const owner = identity.kind === "visitor" ? Prisma.sql`
    EXISTS (SELECT 1 FROM "Visitor" v WHERE v."id" = ${identity.id}
      AND v."consentStatus" = 'GRANTED' AND v."trackingDisabledAt" IS NULL AND v."currentUserId" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "VisitorIdentityLink" link WHERE link."visitorId" = v."id"))
  ` : Prisma.sql`
    NOT EXISTS (SELECT 1 FROM "Visitor" v WHERE v."id" = ${identity.id})
    AND (
      EXISTS (SELECT 1 FROM "SearchHistory" s
        WHERE s."userId" IS NULL AND s."visitorId" IS NULL AND s."createdAt" <= ${now}
          AND s."query"->>'operationalSessionId' = ${identity.id}
          AND s."query"->>'environment' = ${environment}
          AND s."query"->>'applicationSource' = ${applicationSource})
      OR EXISTS (SELECT 1 FROM "RedirectLog" r
        WHERE r."userId" IS NULL AND r."visitorId" IS NULL AND r."createdAt" <= ${now}
          AND r."metadata"->>'operationalSessionId' = ${identity.id}
          AND r."metadata"->>'environment' = ${environment}
          AND r."metadata"->>'applicationSource' = ${applicationSource})
    )
  `;
  return Prisma.sql`
    SELECT EXISTS (
      SELECT 1 FROM "OnlinePresenceSession" p
      WHERE p."environment" = ${environment} AND p."sourceId" = ${candidate.sourceId}
        AND p."accountSessionId" IS NULL AND p."platform" = ${candidate.platform}
        AND p."platform" IN ('desktop_web', 'mobile_web', 'ios', 'android')
        AND p."lastSeenAt" = ${candidate.lastSeenAt}
        AND p."lastSeenAt" > ${cutoff} AND p."lastSeenAt" <= ${now}
        AND p."guestActivityObservedAt" = p."lastSeenAt"
        AND p."guestActivityKind" = ${identity.kind} AND p."guestActivityId" = ${identity.id}
        AND p."guestActivityExpiresAt" = ${identity.expiresAt} AND p."guestActivityExpiresAt" > ${now}
        AND (${owner})
    ) AS "eligible"
  `;
}
