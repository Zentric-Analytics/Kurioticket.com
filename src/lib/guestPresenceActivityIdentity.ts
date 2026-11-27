import type { Prisma } from "@/generated/prisma/client";
import { validActivityIdentity } from "./adminIdentityActivity";
import { eligibleGuestVisitorWhere } from "./adminIdentityJourney";
import { onlinePresenceWindowSeconds, type OnlinePresencePlatform } from "./onlinePresence";
import { operationalSessionTtlSeconds, readOperationalSearchSession } from "./operationalSearchSession";
import type { PublicEnvironment } from "./stagingSafety";
import { hashVisitorToken, isSameOriginRequest, readVisitorToken, visitorTrackingDenied } from "./visitor-identity";

/** A reference proved by a credential already held by this anonymous caller.
 * Never persist the credential, its hash, or a client-supplied activity ID here. */
export type GuestPresenceActivityIdentity = {
  kind: "visitor" | "operational";
  id: string;
  expiresAt: Date;
};

const operationalIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Validate a previously proved reference; this does not authenticate an ID. */
export function safeGuestPresenceActivityIdentity(
  value: GuestPresenceActivityIdentity | null | undefined,
  environment: PublicEnvironment,
  now: Date,
): GuestPresenceActivityIdentity | null {
  if (environment !== "staging" || !value || typeof value !== "object"
    || typeof value.id !== "string" || !(value.expiresAt instanceof Date) || !(now instanceof Date)) return null;
  const timestamp = now.getTime();
  const expiry = value.expiresAt.getTime();
  if (!Number.isFinite(timestamp) || !Number.isFinite(expiry) || expiry <= timestamp) return null;

  if (value.kind === "visitor") {
    // Imported legacy Visitors can have canonical IDs other than a CUID.
    // Their source is established by the eligible Visitor lookup, not shape.
    if (!validActivityIdentity("guest", value.id) || expiry > timestamp + onlinePresenceWindowSeconds * 1000) return null;
  } else if (value.kind === "operational") {
    if (!operationalIdPattern.test(value.id) || expiry > timestamp + operationalSessionTtlSeconds * 1000) return null;
  } else return null;

  return { kind: value.kind, id: value.id, expiresAt: new Date(expiry) };
}

function expectedGuestTransport(request: Request, platform: OnlinePresencePlatform) {
  // The route already verifies anonymity and admission. Keep credential reads
  // bound to that explicit platform instead of inferring it from another token.
  if (request.headers.has("authorization")) return false;
  if (platform === "ios" || platform === "android") {
    return request.headers.get("x-mobile-platform") === platform
      && !["cookie", "origin", "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest"]
        .some(name => request.headers.has(name));
  }
  if (platform !== "desktop_web" && platform !== "mobile_web") return false;
  const fetchSite = request.headers.get("sec-fetch-site");
  return !request.headers.has("x-mobile-platform") && request.headers.has("origin")
    && (fetchSite === null || fetchSite === "same-origin") && isSameOriginRequest(request);
}

type ResolverDependencies = {
  getDatabase: () => Pick<Prisma.TransactionClient, "visitor"> | null;
};

/** Read-only optional attribution. In particular, never renew consent, touch
 * Visitor.lastSeenAt, or mint/rotate an operational search credential. */
export function createGuestPresenceActivityIdentityResolver(dependencies: ResolverDependencies) {
  return async function resolveGuestPresenceActivityIdentity(
    request: Request,
    platform: OnlinePresencePlatform,
    environment: PublicEnvironment,
    now: Date,
  ): Promise<GuestPresenceActivityIdentity | null> {
    try {
      if (environment !== "staging" || !(now instanceof Date) || !Number.isFinite(now.getTime())
        || !expectedGuestTransport(request, platform)) return null;
      const native = platform === "ios" || platform === "android";
      const transport = native ? "native" : "web";
      const token = visitorTrackingDenied(request, transport) ? null : readVisitorToken(request, transport);
      if (token) {
        const db = dependencies.getDatabase();
        if (!db) return null;
        const visitor = await db.visitor.findFirst({
          where: {
            tokenHash: hashVisitorToken(token),
            consentStatus: "GRANTED",
            trackingDisabledAt: null,
            currentUserId: null,
            identityLinks: { none: {} },
          },
          select: { id: true },
        });
        if (visitor) return safeGuestPresenceActivityIdentity({
          kind: "visitor", id: visitor.id,
          expiresAt: new Date(now.getTime() + onlinePresenceWindowSeconds * 1000),
        }, environment, now);
      }

      const operational = readOperationalSearchSession(request, now.getTime(), environment);
      // Native v1 proves continuity, but not a platform. Only an existing,
      // matching signed v2 reference can associate a native live guest.
      if (!operational || operational.environment !== environment
        || (native ? operational.nativePlatform !== platform : operational.nativePlatform !== undefined)) return null;
      return safeGuestPresenceActivityIdentity({
        kind: "operational", id: operational.id, expiresAt: operational.expiresAt,
      }, environment, now);
    } catch {
      // Optional identity failure must not fail the independent presence write.
      return null;
    }
  };
}

/** The caller holds this transaction through the presence write. The row lock
 * serializes consent withdrawal/account linking without touching the Visitor.
 * Let SQL errors abort the transaction; catching one inside it cannot recover a
 * PostgreSQL transaction. The presence service handles its optional failure. */
export async function recheckGuestPresenceActivityIdentity(
  tx: Prisma.TransactionClient,
  identity: GuestPresenceActivityIdentity | null,
  now: Date,
): Promise<GuestPresenceActivityIdentity | null> {
  const safe = safeGuestPresenceActivityIdentity(identity, "staging", now);
  if (!safe || safe.kind === "operational") return safe;
  await tx.$queryRaw`SELECT "id" FROM "Visitor" WHERE "id" = ${safe.id} FOR UPDATE`;
  const visitor = await tx.visitor.findFirst({
    where: eligibleGuestVisitorWhere(safe.id),
    select: { id: true },
  });
  return visitor?.id === safe.id ? safe : null;
}
