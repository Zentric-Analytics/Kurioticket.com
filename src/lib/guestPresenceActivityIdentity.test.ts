import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import { eligibleGuestVisitorWhere } from "./adminIdentityJourney";
import {
  createGuestPresenceActivityIdentityResolver, recheckGuestPresenceActivityIdentity,
  safeGuestPresenceActivityIdentity, type GuestPresenceActivityIdentity,
} from "./guestPresenceActivityIdentity";
import { onlinePresenceWindowSeconds, type OnlinePresencePlatform } from "./onlinePresence";
import {
  attachOperationalSearchSession, operationalSessionCookieName, operationalSessionHeaderName,
  prepareOperationalSearchSession, readOperationalSearchSession,
} from "./operationalSearchSession";
import type { PublicEnvironment } from "./stagingSafety";
import { hashVisitorToken, visitorCookieName, visitorHeaderName } from "./visitor-identity";
import { visitorDenialCookieName } from "./visitor-consent-constants";

const now = new Date("2026-11-27T11:00:00.000Z");
const publicOrigin = "https://staging.kurioticket.com";
const visitorToken = "a".repeat(43);
const visitorId = "cmivisitor1234567890abcdef";
const operationalId = "18cc773e-8cd6-4f42-a040-dc2136d7c011";
const platforms = ["desktop_web", "mobile_web", "ios", "android"] as const;
const nativePlatform = (platform: OnlinePresencePlatform) => platform === "ios" || platform === "android";

function request(platform: OnlinePresencePlatform, extra: Record<string, string> = {}) {
  return new Request("http://0.0.0.0:10000/api/identity/online-presence", {
    method: "POST",
    headers: {
      ...(nativePlatform(platform) ? { "x-mobile-platform": platform } : { origin: publicOrigin, "sec-fetch-site": "same-origin" }),
      ...extra,
    },
  });
}

async function withConfiguration(run: () => void | Promise<void>) {
  const prior = { AUTH_SECRET: process.env.AUTH_SECRET, NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL };
  process.env.AUTH_SECRET = "test-presence-activity-credentials-not-for-production";
  process.env.NEXT_PUBLIC_APP_URL = publicOrigin;
  process.env.NEXTAUTH_URL = publicOrigin;
  try { await run(); } finally {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

function returnedOperationalCredential(
  platform: OnlinePresencePlatform, environment: PublicEnvironment = "staging", legacy = false,
) {
  const prepared = prepareOperationalSearchSession(request(platform,
    nativePlatform(platform) && !legacy ? { "x-kt-search-protocol": "v2" } : {}), now.getTime(), environment);
  assert.ok(prepared);
  const response = attachOperationalSearchSession(Response.json({ ok: true }), prepared);
  const credential = nativePlatform(platform)
    ? response.headers.get(operationalSessionHeaderName)
    : response.headers.get("set-cookie")?.split(";", 1)[0].slice(operationalSessionCookieName.length + 1);
  assert.ok(credential);
  assert.equal(credential, prepared.credential);
  return { credential, reference: prepared.reference };
}

function credentials(platform: OnlinePresencePlatform, visitor?: string, operational?: string): Record<string, string> {
  if (nativePlatform(platform)) return {
    ...(visitor ? { [visitorHeaderName]: visitor } : {}),
    ...(operational ? { [operationalSessionHeaderName]: operational } : {}),
  };
  const cookies = [visitor ? visitorCookieName + "=" + visitor : "",
    operational ? operationalSessionCookieName + "=" + operational : ""].filter(Boolean);
  return cookies.length ? { cookie: cookies.join("; ") } : {};
}

function database(result: { id: string } | null = { id: visitorId }) {
  const queries: unknown[] = [];
  // Only a read delegate exists: a renewal or attribution write would fail.
  const db = { visitor: { findFirst: async (args: unknown) => {
    queries.push(args);
    return result;
  } } } as unknown as Pick<Prisma.TransactionClient, "visitor">;
  return { db, queries };
}

test("all four platforms prefer an existing eligible Visitor without renewing or exposing its credential", () => withConfiguration(async () => {
  for (const platform of platforms) {
    const { credential } = returnedOperationalCredential(platform);
    const { db, queries } = database();
    const resolve = createGuestPresenceActivityIdentityResolver({ getDatabase: () => db });
    const identity = await resolve(request(platform, credentials(platform, visitorToken, credential)), platform, "staging", now);
    assert.deepEqual(identity, { kind: "visitor", id: visitorId, expiresAt: new Date(now.getTime() + 90_000) });
    assert.deepEqual(queries, [{
      where: { tokenHash: hashVisitorToken(visitorToken), consentStatus: "GRANTED", trackingDisabledAt: null,
        currentUserId: null, identityLinks: { none: {} } },
      select: { id: true },
    }]);
    assert.equal(JSON.stringify(identity).includes(visitorToken), false);
    assert.equal(JSON.stringify(identity).includes(hashVisitorToken(visitorToken)), false);
  }
}));

test("all four platforms use only an existing returned operational credential with its original signed expiry", () => withConfiguration(async () => {
  const resolve = createGuestPresenceActivityIdentityResolver({ getDatabase: () => { throw new Error("No Visitor read expected"); } });
  for (const platform of platforms) {
    const { credential, reference } = returnedOperationalCredential(platform);
    const identity = await resolve(request(platform, credentials(platform, undefined, credential)), platform, "staging", now);
    assert.deepEqual(identity, { kind: "operational", id: reference.id, expiresAt: reference.expiresAt });
    assert.equal(JSON.stringify(identity).includes(credential), false);
  }
}));

test("a web denial cookie blocks Visitor attribution while existing operational continuity remains independent", () => withConfiguration(async () => {
  for (const platform of ["desktop_web", "mobile_web"] as const) {
    const { credential, reference } = returnedOperationalCredential(platform);
    let reads = 0;
    const resolve = createGuestPresenceActivityIdentityResolver({ getDatabase: () => { reads++; throw new Error("Denied Visitor read"); } });
    const headers = credentials(platform, visitorToken, credential);
    const denied = request(platform, { cookie: headers.cookie + "; " + visitorDenialCookieName + "=1" });
    assert.deepEqual(await resolve(denied, platform, "staging", now), {
      kind: "operational", id: reference.id, expiresAt: reference.expiresAt,
    });
    assert.equal(await resolve(request(platform, { cookie: visitorCookieName + "=" + visitorToken + "; " + visitorDenialCookieName + "=1" }), platform, "staging", now), null);
    assert.equal(reads, 0);
  }
}));

test("an ineligible or unknown Visitor can fall back to a valid existing operational credential", () => withConfiguration(async () => {
  for (const platform of platforms) {
    const { credential, reference } = returnedOperationalCredential(platform);
    const { db, queries } = database(null);
    const resolve = createGuestPresenceActivityIdentityResolver({ getDatabase: () => db });
    assert.deepEqual(await resolve(request(platform, credentials(platform, visitorToken, credential)), platform, "staging", now), {
      kind: "operational", id: reference.id, expiresAt: reference.expiresAt,
    });
    assert.equal(queries.length, 1);
    assert.equal(await resolve(request(platform, credentials(platform, visitorToken)), platform, "staging", now), null);
  }
}));

test("optional database failures fail closed instead of switching an unverified Visitor to another identity", () => withConfiguration(async () => {
  const { credential } = returnedOperationalCredential("desktop_web");
  const req = request("desktop_web", credentials("desktop_web", visitorToken, credential));
  const throwing = { visitor: { findFirst: async () => { throw new Error("database unavailable"); } } } as unknown as Pick<Prisma.TransactionClient, "visitor">;
  for (const getDatabase of [() => null, () => { throw new Error("initialization failed"); }, () => throwing]) {
    const resolve = createGuestPresenceActivityIdentityResolver({ getDatabase });
    assert.equal(await resolve(req, "desktop_web", "staging", now), null);
  }
}));

test("missing credentials and production requests never create identities or read Visitors", () => withConfiguration(async () => {
  let reads = 0;
  const resolve = createGuestPresenceActivityIdentityResolver({ getDatabase: () => { reads++; return database().db; } });
  for (const platform of platforms) {
    assert.equal(await resolve(request(platform), platform, "staging", now), null);
    const { credential } = returnedOperationalCredential(platform);
    assert.equal(await resolve(request(platform, credentials(platform, visitorToken, credential)), platform, "production", now), null);
    assert.equal(await resolve(request(platform, credentials(platform, visitorToken, credential)), platform, "staging", new Date(NaN)), null);
  }
  assert.equal(reads, 0);
}));

test("explicit web/native transports never fall back to each other's Visitor credentials", () => withConfiguration(async () => {
  const { db, queries } = database();
  const resolve = createGuestPresenceActivityIdentityResolver({ getDatabase: () => db });
  for (const platform of ["desktop_web", "mobile_web"] as const) {
    assert.equal(await resolve(request(platform, { [visitorHeaderName]: visitorToken }), platform, "staging", now), null);
    assert.equal(await resolve(request(platform, { cookie: visitorCookieName + "=" + visitorToken, "x-mobile-platform": "ios" }), platform, "staging", now), null);
    assert.equal(await resolve(request(platform, { cookie: visitorCookieName + "=" + visitorToken, origin: "https://attacker.example" }), platform, "staging", now), null);
  }
  for (const platform of ["ios", "android"] as const) {
    assert.equal(await resolve(request(platform, { cookie: visitorCookieName + "=" + visitorToken }), platform, "staging", now), null);
    for (const name of ["origin", "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest", "authorization"]) {
      assert.equal(await resolve(request(platform, { [visitorHeaderName]: visitorToken, [name]: "unexpected" }), platform, "staging", now), null);
    }
    assert.equal(await resolve(request(platform, { [visitorHeaderName]: visitorToken, "x-mobile-platform": platform === "ios" ? "android" : "ios" }), platform, "staging", now), null);
  }
  assert.equal(queries.length, 0);
}));

test("native legacy v1 continuity cannot prove an activity platform and mismatched v2 never routes", () => withConfiguration(async () => {
  const resolve = createGuestPresenceActivityIdentityResolver({ getDatabase: () => null });
  for (const platform of ["ios", "android"] as const) {
    const legacy = returnedOperationalCredential(platform, "staging", true);
    const legacyRequest = request(platform, credentials(platform, undefined, legacy.credential));
    assert.ok(readOperationalSearchSession(legacyRequest, now.getTime(), "staging"));
    assert.equal(await resolve(legacyRequest, platform, "staging", now), null);
    const modern = returnedOperationalCredential(platform);
    const other = platform === "ios" ? "android" : "ios";
    assert.equal(await resolve(request(other, credentials(other, undefined, modern.credential)), other, "staging", now), null);
    assert.equal(await resolve(request("desktop_web", credentials("desktop_web", undefined, modern.credential)), "desktop_web", "staging", now), null);
  }
}));

test("expired, tampered, wrong-environment and cross-transport operational credentials yield no identity", () => withConfiguration(async () => {
  const resolve = createGuestPresenceActivityIdentityResolver({ getDatabase: () => null });
  for (const platform of platforms) {
    const { credential, reference } = returnedOperationalCredential(platform);
    const req = request(platform, credentials(platform, undefined, credential));
    assert.equal(await resolve(req, platform, "staging", reference.expiresAt), null);
    const tampered = credential.slice(0, -1) + (credential.endsWith("A") ? "B" : "A");
    assert.equal(await resolve(request(platform, credentials(platform, undefined, tampered)), platform, "staging", now), null);
    const production = returnedOperationalCredential(platform, "production");
    assert.equal(await resolve(request(platform, credentials(platform, undefined, production.credential)), platform, "staging", now), null);
    const wrongTransport: Record<string, string> = nativePlatform(platform)
      ? { cookie: operationalSessionCookieName + "=" + credential }
      : { [operationalSessionHeaderName]: credential };
    assert.equal(await resolve(request(platform, wrongTransport), platform, "staging", now), null);
  }
}));

test("safe references retain canonical legacy Visitor IDs and reject invalid shapes and expiry", () => {
  const visitor: GuestPresenceActivityIdentity = { kind: "visitor", id: visitorId, expiresAt: new Date(now.getTime() + 90_000) };
  const operational: GuestPresenceActivityIdentity = { kind: "operational", id: operationalId, expiresAt: new Date(now.getTime() + 30 * 60_000) };
  assert.deepEqual(safeGuestPresenceActivityIdentity(visitor, "staging", now), visitor);
  assert.deepEqual(safeGuestPresenceActivityIdentity(operational, "staging", now), operational);
  assert.deepEqual(safeGuestPresenceActivityIdentity({ ...visitor, id: operationalId }, "staging", now), { ...visitor, id: operationalId });
  assert.equal(safeGuestPresenceActivityIdentity(visitor, "production", now), null);
  assert.equal(safeGuestPresenceActivityIdentity(null, "staging", now), null);
  assert.equal(safeGuestPresenceActivityIdentity(undefined, "staging", now), null);
  assert.equal(safeGuestPresenceActivityIdentity(visitor, "staging", new Date(NaN)), null);
  for (const id of ["short", "contains/slash", "a".repeat(81), "visitor\ncredential"]) {
    assert.equal(safeGuestPresenceActivityIdentity({ ...visitor, id }, "staging", now), null);
  }
  for (const id of [visitorId, operationalId.toUpperCase(), operationalId.replace("4f42", "5f42"), "" ]) {
    assert.equal(safeGuestPresenceActivityIdentity({ ...operational, id }, "staging", now), null);
  }
  for (const value of [visitor, operational]) {
    for (const expiresAt of [new Date(NaN), now, new Date(now.getTime() - 1), new Date(value.expiresAt.getTime() + 1)]) {
      assert.equal(safeGuestPresenceActivityIdentity({ ...value, expiresAt }, "staging", now), null);
    }
  }
  for (const value of [
    { ...visitor, kind: "user" }, { ...visitor, id: 123456 }, { ...visitor, expiresAt: visitor.expiresAt.toISOString() },
  ]) {
    assert.equal(safeGuestPresenceActivityIdentity(value as unknown as GuestPresenceActivityIdentity, "staging", now), null);
  }
});

test("transaction recheck locks then verifies current consent and ownership without touching the Visitor", async () => {
  const calls: unknown[] = [];
  const tx = {
    $queryRaw: async (parts: TemplateStringsArray, ...values: unknown[]) => {
      calls.push({ sql: parts.join("?"), values });
      return [{ id: visitorId }];
    },
    visitor: { findFirst: async (args: unknown) => { calls.push(args); return { id: visitorId }; } },
  } as unknown as Prisma.TransactionClient;
  const identity: GuestPresenceActivityIdentity = { kind: "visitor", id: visitorId,
    expiresAt: new Date(now.getTime() + onlinePresenceWindowSeconds * 1000) };
  assert.deepEqual(await recheckGuestPresenceActivityIdentity(tx, identity, now), identity);
  assert.deepEqual(calls, [
    { sql: 'SELECT "id" FROM "Visitor" WHERE "id" = ? FOR UPDATE', values: [visitorId] },
    { where: eligibleGuestVisitorWhere(visitorId), select: { id: true } },
  ]);
});

test("withdrawal or account linking between initial resolution and transaction recheck removes attribution", () => withConfiguration(async () => {
  const { db } = database();
  const resolve = createGuestPresenceActivityIdentityResolver({ getDatabase: () => db });
  const identity = await resolve(request("desktop_web", credentials("desktop_web", visitorToken)), "desktop_web", "staging", now);
  assert.ok(identity);
  let locked = false;
  const tx = {
    $queryRaw: async () => { locked = true; return [{ id: visitorId }]; },
    visitor: { findFirst: async (args: unknown) => {
      assert.equal(locked, true);
      assert.deepEqual(args, { where: eligibleGuestVisitorWhere(visitorId), select: { id: true } });
      return null;
    } },
  } as unknown as Prisma.TransactionClient;
  assert.equal(await recheckGuestPresenceActivityIdentity(tx, identity, now), null);
}));

test("transaction recheck performs no Visitor query for operational, missing or expired references", async () => {
  const tx = {} as Prisma.TransactionClient;
  const operational: GuestPresenceActivityIdentity = { kind: "operational", id: operationalId, expiresAt: new Date(now.getTime() + 60_000) };
  assert.deepEqual(await recheckGuestPresenceActivityIdentity(tx, operational, now), operational);
  assert.equal(await recheckGuestPresenceActivityIdentity(tx, null, now), null);
  assert.equal(await recheckGuestPresenceActivityIdentity(tx, { kind: "visitor", id: visitorId, expiresAt: now }, now), null);
});

test("SQL recheck errors propagate for the caller to roll back the transaction", async () => {
  const identity: GuestPresenceActivityIdentity = { kind: "visitor", id: visitorId, expiresAt: new Date(now.getTime() + 90_000) };
  const failure = new Error("Visitor lock failed");
  const tx = { $queryRaw: async () => { throw failure; } } as unknown as Prisma.TransactionClient;
  await assert.rejects(recheckGuestPresenceActivityIdentity(tx, identity, now), error => error === failure);
});
