import { Prisma } from "@/generated/prisma/client";
import { generalFaqs } from "@/content/faqs";
import { getPrisma } from "@/lib/prisma";
import {
  CmsContentError,
  cmsPayloadSchemas,
  type CmsActor,
} from "@/services/cmsContentService";

const FAQ_MARKET = "GLOBAL";
const FAQ_LOCALE = "en";
const FAQ_LEGACY_LOCALES = ["en-us", "en-gb"] as const;
const FAQ_ENGLISH_LOCALES = [FAQ_LOCALE, ...FAQ_LEGACY_LOCALES] as const;

function normalizeActor(actor: CmsActor) {
  return { ...actor, email: actor.email.trim().toLowerCase() };
}

function duplicateKeys(items: Array<{ key: string }>) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const item of items) {
    if (seen.has(item.key)) duplicates.add(item.key);
    seen.add(item.key);
  }
  return [...duplicates];
}

export async function initializeFaqCms(actorInput: CmsActor) {
  const actor = normalizeActor(actorInput);
  const db = getPrisma();

  try {
    return await db.$transaction(async (tx) => {
      const canonicalScope = await tx.cmsContentScope.findUnique({
        where: {
          type_market_locale: {
            type: "FAQ",
            market: FAQ_MARKET,
            locale: FAQ_LOCALE,
          },
        },
        select: { id: true },
      });

      if (canonicalScope) {
        throw new CmsContentError(
          "CONFLICT",
          "FAQ CMS is already initialized for English content.",
        );
      }

      const [currentEnglishItems, publishedEnglishItems, legacyScopes] = await Promise.all([
        tx.cmsContentItem.findMany({
          where: {
            type: "FAQ",
            market: FAQ_MARKET,
            locale: { in: [...FAQ_ENGLISH_LOCALES] },
          },
          select: {
            id: true,
            key: true,
            status: true,
            publishedPayload: true,
          },
        }),
        tx.cmsContentItem.findMany({
          where: {
            type: "FAQ",
            publishedMarket: FAQ_MARKET,
            publishedLocale: { in: [...FAQ_ENGLISH_LOCALES] },
          },
          select: {
            id: true,
            key: true,
            status: true,
            publishedPayload: true,
          },
        }),
        tx.cmsContentScope.findMany({
          where: {
            type: "FAQ",
            market: FAQ_MARKET,
            locale: { in: [...FAQ_LEGACY_LOCALES] },
          },
          select: { id: true, locale: true },
        }),
      ]);

      const duplicateCurrentKeys = duplicateKeys(currentEnglishItems);
      const duplicatePublishedKeys = duplicateKeys(publishedEnglishItems);
      if (duplicateCurrentKeys.length || duplicatePublishedKeys.length) {
        throw new CmsContentError(
          "CONFLICT",
          "Legacy English FAQ records contain duplicate keys and need manual reconciliation before initialization.",
          {
            currentKeys: duplicateCurrentKeys,
            publishedKeys: duplicatePublishedKeys,
          },
        );
      }

      const existingIds = new Set([
        ...currentEnglishItems.map((item) => item.id),
        ...publishedEnglishItems.map((item) => item.id),
      ]);

      if (currentEnglishItems.length > 0) {
        await tx.cmsContentItem.updateMany({
          where: {
            type: "FAQ",
            market: FAQ_MARKET,
            locale: { in: [...FAQ_ENGLISH_LOCALES] },
          },
          data: { locale: FAQ_LOCALE },
        });
      }

      if (publishedEnglishItems.length > 0) {
        await tx.cmsContentItem.updateMany({
          where: {
            type: "FAQ",
            publishedMarket: FAQ_MARKET,
            publishedLocale: { in: [...FAQ_ENGLISH_LOCALES] },
          },
          data: { publishedLocale: FAQ_LOCALE },
        });
      }

      if (legacyScopes.length > 0) {
        await tx.cmsContentScope.deleteMany({
          where: {
            type: "FAQ",
            market: FAQ_MARKET,
            locale: { in: [...FAQ_LEGACY_LOCALES] },
          },
        });
      }

      const publishedHistoryCount = await tx.cmsContentItem.count({
        where: {
          type: "FAQ",
          publishedMarket: FAQ_MARKET,
          publishedLocale: FAQ_LOCALE,
          publishedPayload: { not: Prisma.DbNull },
        },
      });

      const existingKeys = new Set(
        (
          await tx.cmsContentItem.findMany({
            where: {
              type: "FAQ",
              market: FAQ_MARKET,
              locale: FAQ_LOCALE,
            },
            select: { key: true },
          })
        ).map((item) => item.key),
      );

      const now = new Date();
      let seededCount = 0;

      if (publishedHistoryCount === 0) {
        for (const [index, faq] of generalFaqs.entries()) {
          const payload = cmsPayloadSchemas.FAQ.parse({
            question: faq.question,
            answer: faq.answer,
            category: "General",
          }) as Prisma.InputJsonValue;

          const serial = String(index + 1).padStart(3, "0");
          let key = `faq-${serial}`;
          let suffix = 1;
          while (existingKeys.has(key)) {
            key = `faq-default-${serial}-${suffix}`;
            suffix += 1;
          }
          existingKeys.add(key);

          const item = await tx.cmsContentItem.create({
            data: {
              type: "FAQ",
              key,
              status: "PUBLISHED",
              market: FAQ_MARKET,
              locale: FAQ_LOCALE,
              sortOrder: index,
              publishedMarket: FAQ_MARKET,
              publishedLocale: FAQ_LOCALE,
              publishedSortOrder: index,
              draftPayload: payload,
              publishedPayload: payload,
              version: 1,
              publishedVersion: 1,
              createdByAdminUserId: actor.id,
              updatedByAdminUserId: actor.id,
              publishedByAdminUserId: actor.id,
              publishedAt: now,
            },
          });

          await tx.cmsContentRevision.create({
            data: {
              contentItemId: item.id,
              version: 1,
              action: "PUBLISHED",
              status: "PUBLISHED",
              market: FAQ_MARKET,
              locale: FAQ_LOCALE,
              sortOrder: index,
              publishedMarket: FAQ_MARKET,
              publishedLocale: FAQ_LOCALE,
              publishedSortOrder: index,
              draftPayload: payload,
              publishedPayload: payload,
              actorUserId: actor.id,
              actorEmail: actor.email,
            },
          });
          seededCount += 1;
        }
      }

      await tx.cmsContentScope.create({
        data: {
          type: "FAQ",
          market: FAQ_MARKET,
          locale: FAQ_LOCALE,
        },
      });

      const migratedCount = existingIds.size;
      const preservedDraftCount = currentEnglishItems.filter(
        (item) => item.publishedPayload === null,
      ).length;

      await tx.adminAuditLog.create({
        data: {
          adminUserId: actor.id,
          adminEmail: actor.email,
          action: "CMS_FAQ_INITIALIZED",
          targetType: "CmsContentScope",
          targetId: `FAQ:${FAQ_MARKET}:${FAQ_LOCALE}`,
          metadata: {
            type: "FAQ",
            market: FAQ_MARKET,
            locale: FAQ_LOCALE,
            seededCount,
            migratedCount,
            migratedLegacyScopeCount: legacyScopes.length,
            preservedDraftCount,
          } as Prisma.InputJsonValue,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
      });

      return {
        count: seededCount,
        seededCount,
        migratedCount,
        migratedLegacyScopeCount: legacyScopes.length,
        preservedDraftCount,
        market: FAQ_MARKET,
        locale: FAQ_LOCALE,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof CmsContentError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      throw new CmsContentError(
        "CONFLICT",
        "FAQ CMS changed while initialization was running. Refresh before retrying.",
      );
    }
    throw error;
  }
}

export const faqCmsScope = {
  market: FAQ_MARKET,
  locale: FAQ_LOCALE,
} as const;

export const faqCmsLegacyLocales = FAQ_LEGACY_LOCALES;
