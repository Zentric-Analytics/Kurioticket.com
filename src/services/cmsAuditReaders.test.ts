import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@/generated/prisma/client";
import { getAdminCmsContent, getAdminCmsHotelOptions, listAdminCmsFaqPage, CmsContentError } from "./cmsContentService";
import { getCmsScopeIntegrity } from "./cmsHardeningService";

const globalDb = globalThis as unknown as { kurioticketPrisma?: PrismaClient };
const payload = { question: "Question", answer: "Answer", category: "General" };
const item = {
  id: "content-123", key: "faq-first", type: "FAQ", status: "PUBLISHED", market: "GLOBAL", locale: "en", sortOrder: 0,
  publishedMarket: "GLOBAL", publishedLocale: "en", publishedSortOrder: 0, draftPayload: payload, publishedPayload: payload,
  version: 120, publishedVersion: 1, publishedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
};

test("CMS audit readers paginate history and FAQ order and compare actual snapshots", async (t) => {
  const originalDb = globalDb.kurioticketPrisma;
  const originalUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://cms-test.invalid/test";
  function db(value: object) { globalDb.kurioticketPrisma = value as PrismaClient; }
  try {
    await t.test("all 120 revisions remain reachable, with strict scoped version boundaries", async () => {
      const revisions = Array.from({ length: 120 }, (_, i) => ({ ...item, id: `revision-${120 - i}`, version: 120 - i, action: "UPDATED", actorEmail: "admin@example.test" }));
      db({ cmsContentItem: { findUnique: async ({ where, include }: { where: { id: string }; include: { revisions: { take: number; where?: { version: { lt: number } } } } }) => {
        assert.equal(where.id, item.id);
        const before = include.revisions.where?.version.lt ?? Infinity;
        return { ...item, revisions: revisions.filter(r => r.version < before).slice(0, include.revisions.take) };
      } } });
      const versions: number[] = [];
      let before: string | undefined;
      do {
        const page = await getAdminCmsContent(item.id, before);
        versions.push(...page.revisions.map(r => r.version));
        before = page.nextRevisionBefore ?? undefined;
      } while (before);
      assert.deepEqual(versions, Array.from({ length: 120 }, (_, i) => 120 - i));
      for (const invalid of ["0", "-1", "2.5", "2oops", "9007199254740993"]) await assert.rejects(getAdminCmsContent(item.id, invalid), CmsContentError);
    });
    await t.test("FAQ ordering happens before pagination and cursors reject different filters", async () => {
      const rows = Array.from({ length: 205 }, (_, i) => ({ ...item, id: `content-${String(i).padStart(4, "0")}`, key: `faq-${String(i).padStart(4, "0")}`, sortOrder: 204 - i, updatedAt: new Date(2026, 0, 1, 0, 0, i) }));
      const fake = { cmsContentItem: { findMany: async ({ where, take }: { where: { OR?: Array<{ updatedAt: { lt?: Date } }> }; take: number }) => {
        const before = where.OR?.[0]?.updatedAt?.lt;
        return rows.filter(row => !before || row.updatedAt < before).slice().reverse().slice(0, take);
      } }, $transaction: async (run: (tx: object) => unknown) => run(fake) };
      db(fake);
      const first = await listAdminCmsFaqPage({});
      assert.deepEqual(first.items.map(i => i.sortOrder), Array.from({ length: 100 }, (_, i) => i));
      const second = await listAdminCmsFaqPage({ cursor: first.nextCursor! });
      const third = await listAdminCmsFaqPage({ cursor: second.nextCursor! });
      assert.deepEqual([...first.items, ...second.items, ...third.items].map(i => i.sortOrder), Array.from({ length: 205 }, (_, i) => i));
      assert.equal(third.nextCursor, null);
      await assert.rejects(listAdminCmsFaqPage({ cursor: first.nextCursor!, category: "Other" }), CmsContentError);
    });
    await t.test("hotel choices identify owners from both draft and published identities", async () => {
      db({ cmsContentItem: { findMany: async ({ where }: { where: { status: { not: string } } }) => {
        assert.equal(where.status.not, "ARCHIVED");
        return [{ id: "managed-london", draftPayload: { canonicalId: "hotel:gb-london" }, publishedPayload: { canonicalId: "hotel:ng-lagos" } }];
      } } });
      const options = await getAdminCmsHotelOptions();
      assert.equal(options.find(option => option.canonicalId === "hotel:gb-london")?.managedItemId, "managed-london");
      assert.equal(options.find(option => option.canonicalId === "hotel:ng-lagos")?.managedItemId, "managed-london");
      assert.ok(options.some(option => !option.managedItemId));
    });
    await t.test("no-op saves do not inflate CMS Health unpublished counts", async () => {
      let current = item;
      db({ cmsContentScope: { findUnique: async () => ({ id: "scope", version: 1, legacyFallbackRetiredAt: null }) }, cmsContentItem: { findMany: async () => [current] } });
      assert.equal((await getCmsScopeIntegrity({ type: "FAQ", market: "GLOBAL", locale: "en" })).unpublishedChanges, 0);
      current = { ...item, sortOrder: 1 };
      assert.equal((await getCmsScopeIntegrity({ type: "FAQ", market: "GLOBAL", locale: "en" })).unpublishedChanges, 1);
    });
  } finally {
    globalDb.kurioticketPrisma = originalDb;
    if (originalUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalUrl;
  }
});
