import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import { loadIsolatedModule } from "../test-support/loadIsolatedModule";
import * as onlinePresence from "../lib/onlinePresence";
import * as presenceCredential from "../lib/onlinePresenceCredential";
import * as firstAccess from "../lib/guestFirstAccessObservation";
import * as liveCountry from "../lib/guestLiveCountry";
import * as guestPresenceWrite from "../lib/liveGuestPresenceWrite";
import * as presenceWrite from "../lib/onlinePresenceWrite";
import * as guestIdentity from "../lib/guestPresenceActivityIdentity";
import * as deviceHistory from "../lib/adminDeviceHistory";
import * as devicePlatform from "../lib/adminDevicePlatform";
import type * as DeviceService from "./adminDeviceSessionsService";
import type * as PresenceService from "./onlinePresenceService";

const database = process.env.USER_ACCESS_TEST_DATABASE_URL;

/** Actual production writer and reader against an isolated, migrated database.
 * The only module substitutions are server-only loading and the database port.
 * This deliberately ordered replay does not claim to reproduce a past browser
 * incident or test the HTTP authentication boundary.
 */
test("PostgreSQL characterizes a heartbeat advancing beyond the profile's captured access cutoff", { skip: !database }, async () => {
  const target = new URL(database!);
  assert.equal(target.protocol, "postgresql:");
  assert.ok(["localhost", "127.0.0.1"].includes(target.hostname), "only a disposable local PostgreSQL server is allowed");
  assert.equal(target.pathname, "/kurioticket_guest_observations_test", "use the explicit CI test database connection");
  assert.equal(target.search, "");
  assert.equal(target.hash, "");
  const name = "kt_access_timing_" + randomUUID().replaceAll("-", "");
  const controlUrl = new URL(target);
  controlUrl.pathname = "/postgres";
  const isolatedUrl = new URL(target);
  isolatedUrl.pathname = "/" + name;
  const control = new Client({ connectionString: controlUrl.href });
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: isolatedUrl.href }), log: [] });
  let created = false;
  await control.connect();
  try {
    await control.query('CREATE DATABASE "' + name + '"');
    created = true;
    execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: isolatedUrl.href }, stdio: "pipe", timeout: 120_000,
    });
    const prismaPort = { getOptionalPrisma: () => db, isDatabaseConfigured: () => true };
    const presence = loadIsolatedModule<typeof PresenceService>("src/services/onlinePresenceService.ts", {
      "server-only": {},
      "node:crypto": { randomUUID },
      "@/lib/prisma": prismaPort,
      "@/lib/onlinePresence": onlinePresence,
      "@/lib/onlinePresenceCredential": presenceCredential,
      "@/lib/guestFirstAccessObservation": firstAccess,
      "@/lib/guestLiveCountry": liveCountry,
      "@/lib/liveGuestPresenceWrite": guestPresenceWrite,
      "@/lib/onlinePresenceWrite": presenceWrite,
      "@/services/guestPresenceActivityIdentity": guestIdentity,
    });
    const reader = loadIsolatedModule<typeof DeviceService>("src/services/adminDeviceSessionsService.ts", {
      "server-only": {},
      "@/generated/prisma/client": { Prisma },
      "@/lib/prisma": prismaPort,
      "@/lib/onlinePresence": onlinePresence,
      "@/lib/stagingSafety": { getPublicEnvironment: () => "staging" },
      "@/services/onlinePresenceService": presence,
      "@/lib/adminDeviceHistory": deviceHistory,
      "@/lib/adminDevicePlatform": devicePlatform,
    });

    const requestedAt = new Date("2026-11-27T07:55:00.000Z");
    const heartbeatAt = new Date(+requestedAt + 1_000);
    const beforeHeartbeat = new Date(+requestedAt - 70_000);
    const ownerId = randomUUID(), otherId = randomUUID();
    const currentId = randomUUID(), signedOutId = randomUUID(), otherSessionId = randomUUID();
    await db.user.createMany({ data: [ownerId, otherId].map(id => ({ id, emailVerified: new Date(+requestedAt - 86_400_000) })) });
    const session = { client: "WEB" as const, authMethod: "PASSWORD" as const, assuranceLevel: "PRIMARY" as const,
      sessionVersion: 0, createdAt: new Date(+requestedAt - 86_400_000), expiresAt: new Date(+requestedAt + 86_400_000),
      os: "Windows", deviceLabel: "Windows computer", locationLabel: "Nigeria" };
    await db.accountSession.createMany({ data: [
      { ...session, id: currentId, userId: ownerId, browser: "Edge 157", lastSeenAt: beforeHeartbeat },
      { ...session, id: signedOutId, userId: ownerId, browser: "Chrome 158", lastSeenAt: new Date(+requestedAt - 4 * 3_600_000),
        revokedAt: new Date(+requestedAt - 3 * 3_600_000), revokeReason: "web_logout" },
      { ...session, id: otherSessionId, userId: otherId, browser: "Safari 26", lastSeenAt: new Date(+heartbeatAt + 500) },
    ] });
    const latest = async (at: Date) => {
      const result = await reader.loadAdminDeviceSessions(ownerId, "America/Los_Angeles", at, "all");
      assert.equal(result.status, "ok");
      if (result.status !== "ok") throw new Error("Device reader unavailable");
      assert.equal(result.sessions.length, 1);
      assert.notEqual(result.sessions[0].id, otherSessionId, "another account cannot become the latest access");
      return result.sessions[0];
    };
    assert.equal((await latest(requestedAt)).id, currentId, "the current device is selected before the heartbeat");

    // The account row represents a verified canonical session. Execute the
    // unchanged accepted-heartbeat writer and await its commit before the
    // delayed profile reader resumes with its original request timestamp.
    const sourceId = randomUUID();
    await presence.recordOnlinePresence({ environment: "staging", sourceId, platform: "desktop_web", accountSessionId: currentId,
      now: heartbeatAt, device: { deviceLabel: "Windows computer", browser: "Edge 157", os: "Windows", locationLabel: "Nigeria" } });
    const saved = await db.accountSession.findUniqueOrThrow({ where: { id: currentId } });
    assert.equal(+saved.lastSeenAt, +heartbeatAt, "the real heartbeat writer advances the authenticated session");
    assert.equal(saved.revokedAt, null);
    const observed = await db.onlinePresenceSession.findUniqueOrThrow({ where: { environment_sourceId: { environment: "staging", sourceId } } });
    assert.equal(observed.accountSessionId, currentId);

    // Temporary characterization gate: after CI proves this before-result,
    // replace this assertion with currentId in the correction commit. This is
    // evidence of the timing mechanism, not an accepted product contract.
    assert.equal((await latest(requestedAt)).id, signedOutId, "captured cutoff currently falls back to an older signed-out browser");
    assert.equal((await latest(new Date(+heartbeatAt + 1_000))).id, currentId, "a subsequent request sees the still-present current session");
    console.log("Verified PostgreSQL replay: current device before heartbeat; older signed-out device with stale cutoff; current device on next request.");
  } finally {
    await db.$disconnect();
    if (created) await control.query('DROP DATABASE "' + name + '"');
    await control.end();
  }
});
