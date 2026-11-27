import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { getPrisma } from "./prisma";
import { writeGuestPresenceDetails } from "./liveGuestPresenceWrite";
import { writeOnlinePresence } from "./onlinePresenceWrite";
import { recheckGuestPresenceActivityIdentity, type GuestPresenceActivityIdentity } from "./guestPresenceActivityIdentity";
import { liveGuestHistoryTargetSql, type LiveGuestHistoryCandidate } from "./adminLiveGuestHistory";
import type { OnlinePresenceHeartbeat } from "./onlinePresenceRoute";

const database = process.env.GUEST_COUNTRY_TEST_DATABASE_URL;
const now = new Date("2026-11-27T01:00:00Z");
const source = () => randomBytes(32).toString("hex");
const operational = (): GuestPresenceActivityIdentity => ({ kind: "operational", id: randomUUID(), expiresAt: new Date(+now + 20 * 60_000) });

test("PostgreSQL ownership changes are atomic, clear below throttle, and cannot be restored by stale or equal writes", { skip: !database }, async () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = database!;
  const db = getPrisma();
  const sourceId = source(), userId = randomUUID(), accountSessionId = randomUUID();
  const owner = operational(), replacement = operational();
  const heartbeat: OnlinePresenceHeartbeat = { environment: "staging", sourceId, platform: "android", accountSessionId: null, now, guestActivity: owner };
  const read = () => db.onlinePresenceSession.findUniqueOrThrow({ where: { environment_sourceId: { environment: "staging", sourceId } } });
  try {
    await db.user.create({ data: { id: userId } });
    await db.accountSession.create({ data: { id: accountSessionId, userId, client: "MOBILE", platform: "android",
      authMethod: "PASSWORD", assuranceLevel: "PRIMARY", sessionVersion: 0, expiresAt: new Date(+now + 60_000) } });
    assert.equal(await writeGuestPresenceDetails(db, heartbeat), 1);
    let row = await read();
    assert.equal(row.guestActivityId, owner.id);
    assert.equal(+row.guestActivityObservedAt!, +row.lastSeenAt);
    assert.equal(+row.guestActivityExpiresAt!, +owner.expiresAt);
    assert.equal(row.guestFirstSeenAt, null);
    assert.equal(await writeGuestPresenceDetails(db, { ...heartbeat, now: new Date(+now + 5000) }), 0, "unchanged owner keeps normal write throttle");
    const changedAt = new Date(+now + 6000);
    assert.equal(await writeGuestPresenceDetails(db, { ...heartbeat, now: changedAt, guestActivity: replacement }), 1);
    assert.equal((await read()).guestActivityId, replacement.id);
    assert.equal(await writeGuestPresenceDetails(db, { ...heartbeat, now: changedAt, guestActivity: null }), 1, "clear wins even an equal timestamp tie");
    assert.equal(await writeGuestPresenceDetails(db, { ...heartbeat, now: changedAt, guestActivity: replacement }), 0);
    assert.equal(await writeGuestPresenceDetails(db, heartbeat), 0);
    row = await read();
    assert.deepEqual([row.guestActivityKind, row.guestActivityId, row.guestActivityObservedAt, row.guestActivityExpiresAt], [null, null, null, null]);
    const restoredAt = new Date(+now + 7000);
    assert.equal(await writeGuestPresenceDetails(db, { ...heartbeat, now: restoredAt }), 1);
    const accountAt = new Date(+now + 8000);
    assert.equal(await writeGuestPresenceDetails(db, { ...heartbeat, now: accountAt, accountSessionId }), 1);
    assert.equal(await writeGuestPresenceDetails(db, { ...heartbeat, now: accountAt }), 0, "same timestamp guest cannot undo sign in");
    assert.equal(await writeGuestPresenceDetails(db, { ...heartbeat, now: restoredAt }), 0);
    row = await read();
    assert.equal(row.accountSessionId, accountSessionId);
    assert.equal(row.guestActivityId, null);
    assert.equal(await writeGuestPresenceDetails(db, { ...heartbeat, now: new Date(+now + 9000) }), 1, "a genuinely later verified logout can establish its own current guest proof");
    assert.equal(await writeGuestPresenceDetails(db, { ...heartbeat, now: new Date(+now + 10_000), guestActivity: null }), 1);
    assert.equal((await read()).guestActivityId, null);
    await writeGuestPresenceDetails(db, { ...heartbeat, environment: "production" });
    const prod = await db.onlinePresenceSession.findUniqueOrThrow({ where: { environment_sourceId: { environment: "production", sourceId } } });
    assert.equal(prod.guestActivityId, null);
  } finally {
    await db.onlinePresenceSession.deleteMany({ where: { sourceId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
    if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous;
  }
});

test("PostgreSQL navigation requires exact source history and fails closed after optional fallback renewal", { skip: !database }, async () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = database!;
  const db = getPrisma();
  const sources: string[] = [], searchIds: string[] = [];
  try {
    for (const platform of ["desktop_web", "mobile_web", "ios", "android"] as const) {
      const sourceId = source(), searchId = randomUUID();
      sources.push(sourceId); searchIds.push(searchId);
      const identity = operational();
      const heartbeat: OnlinePresenceHeartbeat = { environment: "staging", sourceId, platform, accountSessionId: null, now, guestActivity: identity };
      await writeGuestPresenceDetails(db, heartbeat);
      const row = await db.onlinePresenceSession.findUniqueOrThrow({ where: { environment_sourceId: { environment: "staging", sourceId } } });
      const candidate = { ...row, platform } satisfies LiveGuestHistoryCandidate;
      const eligible = async (at = now) => (await db.$queryRaw<Array<{ eligible: boolean }>>(liveGuestHistoryTargetSql(candidate, identity, "staging", at)))[0].eligible;
      assert.equal(await eligible(), false, "credential alone cannot redirect to nonexistent operational history");
      const applicationSource = platform === "ios" ? "IOS" : platform === "android" ? "ANDROID" : "WEB";
      const query = { environment: "staging", operationalSessionId: identity.id, applicationSource };
      await db.searchHistory.create({ data: { id: searchId, type: "CAR", createdAt: now, query } });
      assert.equal(await eligible(), true);
      for (const changed of [
        { ...query, environment: "production" }, { ...query, operationalSessionId: randomUUID() },
        { ...query, applicationSource: "BOT" }, { ...query, applicationSource: applicationSource === "WEB" ? "ANDROID" : "WEB" },
      ]) {
        await db.searchHistory.update({ where: { id: searchId }, data: { query: changed } });
        assert.equal(await eligible(), false);
      }
      await db.searchHistory.update({ where: { id: searchId }, data: { query } });
      assert.equal(await eligible(new Date(+now + 90_000)), false, "old presence cannot authorize navigation");
      assert.equal(await writeOnlinePresence(db, heartbeat, true), 1);
      assert.equal(await eligible(new Date(+now + 1)), false, "equal-time fallback cannot preserve the old ownership tuple");
      assert.equal(await writeGuestPresenceDetails(db, heartbeat), 0, "same-time old optional write cannot undo the invalidation");
      assert.equal(await writeOnlinePresence(db, { ...heartbeat, now: new Date(+now + 1000) }, true), 1);
      assert.equal(await eligible(new Date(+now + 1000)), false, "optional failure invalidates the earlier observation even below throttle");
      const after = await db.onlinePresenceSession.findUniqueOrThrow({ where: { environment_sourceId: { environment: "staging", sourceId } } });
      assert.equal(+after.lastSeenAt, +now + 1000, "canonical presence remains live");
      assert.notEqual(+after.guestActivityObservedAt!, +after.lastSeenAt);
    }
  } finally {
    await db.onlinePresenceSession.deleteMany({ where: { sourceId: { in: sources } } });
    await db.searchHistory.deleteMany({ where: { id: { in: searchIds } } });
    await db.$disconnect();
    if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous;
  }
});

test("PostgreSQL visitor consent and account links invalidate navigation without touching historical last seen", { skip: !database }, async () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = database!;
  const db = getPrisma();
  const sourceId = source(), visitorId = "guest-" + randomUUID(), userId = randomUUID();
  const earlier = new Date(+now - 86_400_000);
  const identity: GuestPresenceActivityIdentity = { kind: "visitor", id: visitorId, expiresAt: new Date(+now + 90_000) };
  const heartbeat: OnlinePresenceHeartbeat = { environment: "staging", sourceId, platform: "mobile_web", accountSessionId: null, now, guestActivity: identity };
  try {
    await db.visitor.create({ data: { id: visitorId, tokenHash: randomBytes(32).toString("hex"), firstSeenAt: earlier, lastSeenAt: earlier } });
    await db.user.create({ data: { id: userId } });
    await db.$transaction(async tx => {
      const guestActivity = await recheckGuestPresenceActivityIdentity(tx, identity, now);
      assert.equal(guestActivity?.id, visitorId);
      await writeGuestPresenceDetails(tx, { ...heartbeat, guestActivity });
    });
    const row = await db.onlinePresenceSession.findUniqueOrThrow({ where: { environment_sourceId: { environment: "staging", sourceId } } });
    const candidate = { ...row, platform: "mobile_web" as const } satisfies LiveGuestHistoryCandidate;
    const eligible = async () => (await db.$queryRaw<Array<{ eligible: boolean }>>(liveGuestHistoryTargetSql(candidate, identity, "staging", now)))[0].eligible;
    assert.equal(await eligible(), true);
    assert.equal(+(await db.visitor.findUniqueOrThrow({ where: { id: visitorId } })).lastSeenAt, +earlier);
    for (const mutation of [{ consentStatus: "WITHDRAWN" as const }, { trackingDisabledAt: now }, { currentUserId: userId }]) {
      await db.visitor.update({ where: { id: visitorId }, data: mutation });
      assert.equal(await eligible(), false);
      assert.equal(await db.$transaction(tx => recheckGuestPresenceActivityIdentity(tx, identity, now)), null);
      await db.visitor.update({ where: { id: visitorId }, data: { consentStatus: "GRANTED", trackingDisabledAt: null, currentUserId: null } });
    }
    await db.visitorIdentityLink.create({ data: { visitorId, userId, source: "SIGN_IN" } });
    assert.equal(await eligible(), false, "a historical account link alone is enough to disqualify anonymous history");
    await db.visitorIdentityLink.deleteMany({ where: { visitorId } });

    let releaseWrite!: () => void, locked!: () => void, withdrawalStarted!: () => void;
    const writeGate = new Promise<void>(resolve => { releaseWrite = resolve; });
    const hasLock = new Promise<void>(resolve => { locked = resolve; });
    const withdrawalGate = new Promise<void>(resolve => { withdrawalStarted = resolve; });
    const concurrentWrite = db.$transaction(async tx => {
      const guestActivity = await recheckGuestPresenceActivityIdentity(tx, identity, now);
      locked();
      await writeGate;
      await writeGuestPresenceDetails(tx, { ...heartbeat, guestActivity });
    });
    await hasLock;
    const withdrawal = db.$transaction(async tx => {
      withdrawalStarted();
      await tx.visitor.update({ where: { id: visitorId }, data: { consentStatus: "WITHDRAWN" } });
    });
    await withdrawalGate;
    releaseWrite();
    await Promise.all([concurrentWrite, withdrawal]);
    assert.equal(await eligible(), false, "withdrawal committed after a locked write immediately closes navigation");
    const next = new Date(+now + 1000);
    await db.$transaction(async tx => {
      const guestActivity = await recheckGuestPresenceActivityIdentity(tx, identity, next);
      assert.equal(guestActivity, null);
      await writeGuestPresenceDetails(tx, { ...heartbeat, now: next, guestActivity });
    });
    assert.equal((await db.onlinePresenceSession.findUniqueOrThrow({ where: { environment_sourceId: { environment: "staging", sourceId } } })).guestActivityId, null);
    assert.equal(+(await db.visitor.findUniqueOrThrow({ where: { id: visitorId } })).lastSeenAt, +earlier);
  } finally {
    await db.onlinePresenceSession.deleteMany({ where: { sourceId } });
    await db.visitor.deleteMany({ where: { id: visitorId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
    if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous;
  }
});
