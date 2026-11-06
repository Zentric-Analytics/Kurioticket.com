import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { CmsContentType } from "@/generated/prisma/enums";
import { getOptionalPrisma, getPrisma } from "@/lib/prisma";
import { homepageCmsLocale, homepageCmsMarkets } from "@/services/homepageCmsService";
import { findMissingHomepageCmsScopes } from "@/lib/adminCmsScopeDiagnostics";
import {
  CmsContentError,
  type CmsActor,
  validateCmsPayloadIntegrity,
} from "@/services/cmsContentService";

type ScopeInput = {
  type: CmsContentType;
  market: string;
  locale: string;
};

type ScopeMutationInput = ScopeInput & {
  expectedScopeVersion: number;
};

function duplicateOrders(values: Array<{ id: string; key?: string; order: number | null }>) {
  const itemsByOrder = new Map<number, Array<{ id: string; key: string }>>();
  for (const entry of values) {
    if (entry.order === null) continue;
    const items = itemsByOrder.get(entry.order) ?? [];
    items.push({ id: entry.id, key: entry.key ?? entry.id });
    itemsByOrder.set(entry.order, items);
  }
  return [...itemsByOrder.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([order, items]) => ({
      order,
      ids: items.map((item) => item.id),
      items,
    }));
}

function summarizeIntegrityIssues(issues: unknown) {
  if (!issues || typeof issues !== "object" || Array.isArray(issues)) {
    return ["Content payload failed validation."];
  }

  const source = issues as Record<string, unknown>;
  const messages: string[] = [];

  if (typeof source.message === "string" && source.message.trim()) {
    messages.push(source.message.trim());
  }

  if (Array.isArray(source.formErrors)) {
    for (const error of source.formErrors) {
      if (typeof error === "string" && error.trim()) messages.push(error.trim());
    }
  }

  if (source.fieldErrors && typeof source.fieldErrors === "object" && !Array.isArray(source.fieldErrors)) {
    for (const [field, errors] of Object.entries(source.fieldErrors as Record<string, unknown>)) {
      if (!Array.isArray(errors)) continue;
      for (const error of errors) {
        if (typeof error === "string" && error.trim()) {
          messages.push(`${field}: ${error.trim()}`);
        }
      }
    }
  }

  return [...new Set(messages)].slice(0, 4).length > 0
    ? [...new Set(messages)].slice(0, 4)
    : ["Content payload failed validation."];
}

function orderNeedsNormalization(values: Array<{ id: string; order: number | null }>) {
  const ordered = [...values].sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id),
  );
  return ordered.some((entry, index) => entry.order !== index);
}

export async function getCmsScopeIntegrity(input: ScopeInput) {
  const db = getOptionalPrisma();
  if (!db) {
    return {
      available: false,
      active: false,
      healthy: false,
      scopeVersion: null,
      legacyFallbackRetired: false,
      total: 0,
      invalidDrafts: [],
      invalidPublished: [],
      orphanPublished: [],
      draftOrderCollisions: [],
      publishedOrderCollisions: [],
      draftOrderNeedsNormalization: false,
      unpublishedChanges: 0,
      fallbackRetirementEligible: false,
    };
  }

  const [scope, items] = await Promise.all([
    db.cmsContentScope.findUnique({
      where: {
        type_market_locale: {
          type: input.type,
          market: input.market,
          locale: input.locale,
        },
      },
      select: {
        id: true,
        version: true,
        legacyFallbackRetiredAt: true,
      },
    }),
    db.cmsContentItem.findMany({
      where: {
        type: input.type,
        OR: [
          { market: input.market, locale: input.locale },
          { publishedMarket: input.market, publishedLocale: input.locale },
        ],
      },
      select: {
        id: true,
        key: true,
        type: true,
        status: true,
        market: true,
        locale: true,
        sortOrder: true,
        publishedMarket: true,
        publishedLocale: true,
        publishedSortOrder: true,
        draftPayload: true,
        publishedPayload: true,
        version: true,
        publishedVersion: true,
      },
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
    }),
  ]);

  const invalidDrafts: Array<{ id: string; key: string; details: string[] }> = [];
  const invalidPublished: Array<{ id: string; key: string; details: string[] }> = [];
  const orphanPublished: Array<{ id: string; key: string }> = [];

  const draftOrderEntries: Array<{ id: string; key: string; order: number | null }> = [];
  const publishedOrderEntries: Array<{ id: string; key: string; order: number | null }> = [];

  let unpublishedChanges = 0;

  for (const item of items) {
    const inDraftScope =
      item.market === input.market &&
      item.locale === input.locale &&
      item.status !== "ARCHIVED";
    const inPublishedScope =
      item.publishedMarket === input.market &&
      item.publishedLocale === input.locale;

    if (inDraftScope) {
      draftOrderEntries.push({ id: item.id, key: item.key, order: item.sortOrder });
      const draftIntegrity = validateCmsPayloadIntegrity(item.type, item.draftPayload);
      if (!draftIntegrity.valid) {
        invalidDrafts.push({
          id: item.id,
          key: item.key,
          details: summarizeIntegrityIssues(draftIntegrity.issues),
        });
      }
      if (
        item.publishedVersion !== null &&
        item.version !== item.publishedVersion
      ) {
        unpublishedChanges += 1;
      }
    }

    if (
      inPublishedScope &&
      item.status === "PUBLISHED" &&
      item.publishedPayload !== null
    ) {
      publishedOrderEntries.push({
        id: item.id,
        key: item.key,
        order: item.publishedSortOrder,
      });
      const publishedIntegrity = validateCmsPayloadIntegrity(item.type, item.publishedPayload);
      if (!publishedIntegrity.valid) {
        invalidPublished.push({
          id: item.id,
          key: item.key,
          details: summarizeIntegrityIssues(publishedIntegrity.issues),
        });
      }
    }

    if (
      item.status === "PUBLISHED" &&
      inDraftScope &&
      item.publishedPayload === null
    ) {
      orphanPublished.push({ id: item.id, key: item.key });
    }
  }

  const draftOrderCollisions = duplicateOrders(draftOrderEntries);
  const publishedOrderCollisions = duplicateOrders(publishedOrderEntries);
  const draftOrderNeedsNormalization = orderNeedsNormalization(draftOrderEntries);
  const healthy =
    Boolean(scope) &&
    invalidDrafts.length === 0 &&
    invalidPublished.length === 0 &&
    orphanPublished.length === 0 &&
    draftOrderCollisions.length === 0 &&
    !draftOrderNeedsNormalization &&
    publishedOrderCollisions.length === 0;

  return {
    available: true,
    active: Boolean(scope),
    healthy,
    scopeVersion: scope?.version ?? null,
    legacyFallbackRetired: Boolean(scope?.legacyFallbackRetiredAt),
    total: items.length,
    invalidDrafts,
    invalidPublished,
    orphanPublished,
    draftOrderCollisions,
    publishedOrderCollisions,
    draftOrderNeedsNormalization,
    unpublishedChanges,
    fallbackRetirementEligible:
      Boolean(scope) &&
      invalidPublished.length === 0 &&
      orphanPublished.length === 0 &&
      publishedOrderCollisions.length === 0,
  };
}

export async function normalizeCmsDraftOrder(
  input: ScopeMutationInput,
  actor: CmsActor,
) {
  const db = getPrisma();

  try {
    return await db.$transaction(async (tx) => {
      const scope = await tx.cmsContentScope.findUnique({
        where: {
          type_market_locale: {
            type: input.type,
            market: input.market,
            locale: input.locale,
          },
        },
      });
      if (!scope) throw new CmsContentError("NOT_FOUND", "CMS scope not found.");
      if (scope.version !== input.expectedScopeVersion) {
        throw new CmsContentError(
          "CONFLICT",
          "CMS scope changed since it was opened. Refresh before normalizing order.",
        );
      }

      const items = await tx.cmsContentItem.findMany({
        where: {
          type: input.type,
          market: input.market,
          locale: input.locale,
          status: { not: "ARCHIVED" },
        },
        orderBy: [{ sortOrder: "asc" }, { key: "asc" }, { id: "asc" }],
      });

      const changes = items
        .map((item, index) => ({ item, nextOrder: index }))
        .filter(({ item, nextOrder }) => item.sortOrder !== nextOrder);

      if (changes.length === 0) {
        return {
          changed: 0,
          scopeVersion: scope.version,
        };
      }

      const scopeChanged = await tx.cmsContentScope.updateMany({
        where: {
          id: scope.id,
          version: input.expectedScopeVersion,
        },
        data: { version: { increment: 1 } },
      });
      if (scopeChanged.count !== 1) {
        throw new CmsContentError(
          "CONFLICT",
          "CMS scope changed concurrently. Refresh before normalizing order.",
        );
      }

      const revisions: Prisma.CmsContentRevisionCreateManyInput[] = [];

      for (const { item, nextOrder } of changes) {
        const updated = await tx.cmsContentItem.updateMany({
          where: {
            id: item.id,
            version: item.version,
            status: { not: "ARCHIVED" },
          },
          data: {
            sortOrder: nextOrder,
            version: { increment: 1 },
            updatedByAdminUserId: actor.id,
          },
        });
        if (updated.count !== 1) {
          throw new CmsContentError(
            "CONFLICT",
            "CMS content changed concurrently. Refresh before normalizing order.",
          );
        }

        revisions.push({
          contentItemId: item.id,
          version: item.version + 1,
          action: "ORDER_NORMALIZED",
          status: item.status,
          market: item.market,
          locale: item.locale,
          sortOrder: nextOrder,
          publishedMarket: item.publishedMarket,
          publishedLocale: item.publishedLocale,
          publishedSortOrder: item.publishedSortOrder,
          draftPayload: item.draftPayload as Prisma.InputJsonValue,
          publishedPayload:
            item.publishedPayload === null
              ? Prisma.DbNull
              : item.publishedPayload as Prisma.InputJsonValue,
          actorUserId: actor.id,
          actorEmail: actor.email.trim().toLowerCase(),
        });
      }

      await tx.cmsContentRevision.createMany({ data: revisions });
      await tx.adminAuditLog.create({
        data: {
          adminUserId: actor.id,
          adminEmail: actor.email.trim().toLowerCase(),
          action: "CMS_ORDER_NORMALIZED",
          targetType: "CmsContentScope",
          targetId: scope.id,
          metadata: {
            type: input.type,
            market: input.market,
            locale: input.locale,
            changed: changes.length,
            previousScopeVersion: input.expectedScopeVersion,
            nextScopeVersion: input.expectedScopeVersion + 1,
          } as Prisma.InputJsonValue,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
      });

      return {
        changed: changes.length,
        scopeVersion: input.expectedScopeVersion + 1,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof CmsContentError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new CmsContentError(
        "CONFLICT",
        "CMS scope changed concurrently. Refresh before normalizing order.",
      );
    }
    throw error;
  }
}

/**
 * Save a drag-reordered draft sequence for exactly one market. The client must
 * submit every non-archived record with its observed version, so filtered views
 * or concurrent edits cannot silently overwrite other records' order.
 *
 * This never modifies publishedSortOrder or publishedPayload. Publication stays
 * an explicit CMS action.
 */
const cmsCardReorderSchema = z.object({
  type: z.enum(["HOMEPAGE_DESTINATION", "FLIGHT_ROUTE"]),
  market: z.string().refine((market) => homepageCmsMarkets.some((allowed) => allowed === market)),
  locale: z.literal("en"),
  items: z.array(z.object({
    id: z.string().min(1).max(128),
    version: z.number().int().min(1),
  }).strict()).min(1).max(1000),
}).strict();

export async function reorderCmsDraftCards(raw: unknown, actor: CmsActor) {
  const parsed = cmsCardReorderSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CmsContentError("INVALID", "Choose a complete market-specific ordering.", parsed.error.flatten());
  }
  const input = parsed.data;
  const ids = input.items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new CmsContentError("INVALID", "Each destination or route must appear exactly once.");
  }

  try {
    return await getPrisma().$transaction(async (tx) => {
      const scope = await tx.cmsContentScope.findUnique({
        where: {
          type_market_locale: { type: input.type, market: input.market, locale: input.locale },
        },
        select: { id: true, version: true },
      });
      if (!scope) throw new CmsContentError("NOT_FOUND", "CMS market scope is not initialized.");

      const current = await tx.cmsContentItem.findMany({
        where: {
          type: input.type,
          market: input.market,
          locale: input.locale,
          status: { not: "ARCHIVED" },
        },
      });
      const byId = new Map(current.map((item) => [item.id, item]));
      if (current.length !== input.items.length ||
        input.items.some(({ id, version }) => byId.get(id)?.version !== version)) {
        throw new CmsContentError(
          "CONFLICT",
          "These records changed or the directory is filtered. Refresh the full list before saving the order.",
        );
      }

      const changes = input.items.flatMap(({ id }, nextOrder) => {
        const item = byId.get(id)!;
        return item.sortOrder === nextOrder ? [] : [{ item, nextOrder }];
      });
      if (!changes.length) return { changed: 0 };

      const scopeUpdated = await tx.cmsContentScope.updateMany({
        where: { id: scope.id, version: scope.version },
        data: { version: { increment: 1 } },
      });
      if (scopeUpdated.count !== 1) {
        throw new CmsContentError("CONFLICT", "CMS scope changed concurrently. Refresh and try again.");
      }

      const revisions: Prisma.CmsContentRevisionCreateManyInput[] = [];
      for (const { item, nextOrder } of changes) {
        const updated = await tx.cmsContentItem.updateMany({
          where: {
            id: item.id,
            version: item.version,
            status: { not: "ARCHIVED" },
            market: input.market,
            locale: input.locale,
            type: input.type,
          },
          data: {
            sortOrder: nextOrder,
            version: { increment: 1 },
            updatedByAdminUserId: actor.id,
          },
        });
        if (updated.count !== 1) {
          throw new CmsContentError("CONFLICT", "A card changed concurrently. Refresh before saving the order.");
        }
        revisions.push({
          contentItemId: item.id,
          version: item.version + 1,
          action: "ORDER_NORMALIZED",
          status: item.status,
          market: item.market,
          locale: item.locale,
          sortOrder: nextOrder,
          publishedMarket: item.publishedMarket,
          publishedLocale: item.publishedLocale,
          publishedSortOrder: item.publishedSortOrder,
          draftPayload: item.draftPayload as Prisma.InputJsonValue,
          publishedPayload: item.publishedPayload === null
            ? Prisma.DbNull
            : item.publishedPayload as Prisma.InputJsonValue,
          actorUserId: actor.id,
          actorEmail: actor.email.trim().toLowerCase(),
        });
      }

      await tx.cmsContentRevision.createMany({ data: revisions });
      await tx.adminAuditLog.create({
        data: {
          adminUserId: actor.id,
          adminEmail: actor.email.trim().toLowerCase(),
          action: "CMS_DRAFT_CARDS_REORDERED",
          targetType: "CmsContentScope",
          targetId: scope.id,
          metadata: {
            type: input.type, market: input.market, locale: input.locale,
            changed: changes.length, total: input.items.length,
          } as Prisma.InputJsonValue,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
      });
      return { changed: changes.length };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
  } catch (error) {
    if (error instanceof CmsContentError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new CmsContentError("CONFLICT", "Another admin changed this market. Refresh before saving the order.");
    }
    throw error;
  }
}

export async function setCmsLegacyFallbackRetired(
  input: ScopeMutationInput & { retired: boolean },
  actor: CmsActor,
) {
  const db = getPrisma();

  try {
    return await db.$transaction(async (tx) => {
      const scope = await tx.cmsContentScope.findUnique({
        where: {
          type_market_locale: {
            type: input.type,
            market: input.market,
            locale: input.locale,
          },
        },
      });
      if (!scope) throw new CmsContentError("NOT_FOUND", "CMS scope not found.");
      if (scope.version !== input.expectedScopeVersion) {
        throw new CmsContentError(
          "CONFLICT",
          "CMS scope changed since it was opened. Refresh before changing fallback policy.",
        );
      }

      if (input.retired) {
        const published = await tx.cmsContentItem.findMany({
          where: {
            type: input.type,
            status: "PUBLISHED",
            publishedMarket: input.market,
            publishedLocale: input.locale,
            publishedPayload: { not: Prisma.DbNull },
          },
          select: {
            id: true,
            key: true,
            status: true,
            publishedPayload: true,
            publishedSortOrder: true,
          },
        });

        const invalid = published.filter(
          (item) =>
            !validateCmsPayloadIntegrity(input.type, item.publishedPayload).valid,
        );
        if (invalid.length > 0) {
          throw new CmsContentError(
            "INVALID",
            "Legacy fallback cannot be retired while published CMS content is invalid.",
            { ids: invalid.map((item) => item.id) },
          );
        }

        const collisions = duplicateOrders(
          published.map((item) => ({
            id: item.id,
            order: item.publishedSortOrder,
          })),
        );
        if (collisions.length > 0) {
          throw new CmsContentError(
            "INVALID",
            "Legacy fallback cannot be retired while published order collisions exist.",
            { collisions },
          );
        }
      }

      const changed = await tx.cmsContentScope.updateMany({
        where: {
          id: scope.id,
          version: input.expectedScopeVersion,
        },
        data: {
          version: { increment: 1 },
          legacyFallbackRetiredAt: input.retired ? new Date() : null,
          legacyFallbackRetiredByAdminUserId: input.retired ? actor.id : null,
        },
      });
      if (changed.count !== 1) {
        throw new CmsContentError(
          "CONFLICT",
          "CMS scope changed concurrently. Refresh before changing fallback policy.",
        );
      }

      await tx.adminAuditLog.create({
        data: {
          adminUserId: actor.id,
          adminEmail: actor.email.trim().toLowerCase(),
          action: input.retired
            ? "CMS_LEGACY_FALLBACK_RETIRED"
            : "CMS_LEGACY_FALLBACK_REACTIVATED",
          targetType: "CmsContentScope",
          targetId: scope.id,
          metadata: {
            type: input.type,
            market: input.market,
            locale: input.locale,
            previousScopeVersion: input.expectedScopeVersion,
            nextScopeVersion: input.expectedScopeVersion + 1,
          } as Prisma.InputJsonValue,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
      });

      return {
        retired: input.retired,
        scopeVersion: input.expectedScopeVersion + 1,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof CmsContentError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new CmsContentError(
        "CONFLICT",
        "CMS scope changed concurrently. Refresh before changing fallback policy.",
      );
    }
    throw error;
  }
}


export async function getCmsHealthOverview() {
  const db = getOptionalPrisma();
  if (!db) {
    return {
      available: false,
      scopes: [],
      missingHomepageScopes: [],
      totals: {
        scopes: 0,
        healthy: 0,
        unhealthy: 0,
        retiredFallback: 0,
        unpublishedChanges: 0,
      },
    };
  }

  const scopes = await db.cmsContentScope.findMany({
    orderBy: [{ type: "asc" }, { market: "asc" }, { locale: "asc" }],
    select: {
      type: true,
      market: true,
      locale: true,
    },
  });

  const missingHomepageScopes = findMissingHomepageCmsScopes(scopes, homepageCmsMarkets, homepageCmsLocale);

  const results = await Promise.all(
    scopes.map(async (scope) => ({
      type: scope.type,
      market: scope.market,
      locale: scope.locale,
      integrity: await getCmsScopeIntegrity(scope),
    })),
  );

  return {
    available: true,
    scopes: results,
    missingHomepageScopes,
    totals: {
      scopes: results.length,
      healthy: results.filter((entry) => entry.integrity.healthy).length,
      unhealthy: results.filter((entry) => !entry.integrity.healthy).length,
      retiredFallback: results.filter(
        (entry) => entry.integrity.legacyFallbackRetired,
      ).length,
      unpublishedChanges: results.reduce(
        (sum, entry) => sum + entry.integrity.unpublishedChanges,
        0,
      ),
    },
  };
}
