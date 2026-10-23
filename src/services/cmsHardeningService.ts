import { Prisma } from "@/generated/prisma/client";
import type { CmsContentType } from "@/generated/prisma/enums";
import { getOptionalPrisma, getPrisma } from "@/lib/prisma";
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

function duplicateOrders(values: Array<{ id: string; order: number | null }>) {
  const idsByOrder = new Map<number, string[]>();
  for (const entry of values) {
    if (entry.order === null) continue;
    const ids = idsByOrder.get(entry.order) ?? [];
    ids.push(entry.id);
    idsByOrder.set(entry.order, ids);
  }
  return [...idsByOrder.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([order, ids]) => ({ order, ids }));
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

  const invalidDrafts: Array<{ id: string; key: string }> = [];
  const invalidPublished: Array<{ id: string; key: string }> = [];
  const orphanPublished: Array<{ id: string; key: string }> = [];

  const draftOrderEntries: Array<{ id: string; order: number | null }> = [];
  const publishedOrderEntries: Array<{ id: string; order: number | null }> = [];

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
      draftOrderEntries.push({ id: item.id, order: item.sortOrder });
      if (!validateCmsPayloadIntegrity(item.type, item.draftPayload).valid) {
        invalidDrafts.push({ id: item.id, key: item.key });
      }
      if (
        item.publishedVersion !== null &&
        item.version !== item.publishedVersion
      ) {
        unpublishedChanges += 1;
      }
    }

    if (inPublishedScope && item.publishedPayload !== null) {
      publishedOrderEntries.push({
        id: item.id,
        order: item.publishedSortOrder,
      });
      if (!validateCmsPayloadIntegrity(item.type, item.publishedPayload).valid) {
        invalidPublished.push({ id: item.id, key: item.key });
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
  const healthy =
    Boolean(scope) &&
    invalidDrafts.length === 0 &&
    invalidPublished.length === 0 &&
    orphanPublished.length === 0 &&
    draftOrderCollisions.length === 0 &&
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
