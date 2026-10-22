import { Prisma } from "@/generated/prisma/client";
import { generalFaqs } from "@/content/faqs";
import { getPrisma } from "@/lib/prisma";
import {
  CmsContentError,
  cmsPayloadSchemas,
  type CmsActor,
} from "@/services/cmsContentService";

const FAQ_MARKET = "GLOBAL";
const FAQ_LOCALE = "en-us";

function normalizeActor(actor: CmsActor) {
  return { ...actor, email: actor.email.trim().toLowerCase() };
}

export async function initializeFaqCms(actorInput: CmsActor) {
  const actor = normalizeActor(actorInput);
  const db = getPrisma();

  try {
    return await db.$transaction(async (tx) => {
      const [scope, existingCount] = await Promise.all([
        tx.cmsContentScope.findUnique({
          where: {
            type_market_locale: {
              type: "FAQ",
              market: FAQ_MARKET,
              locale: FAQ_LOCALE,
            },
          },
          select: { id: true },
        }),
        tx.cmsContentItem.count({
          where: {
            type: "FAQ",
            OR: [
              { market: FAQ_MARKET, locale: FAQ_LOCALE },
              { publishedMarket: FAQ_MARKET, publishedLocale: FAQ_LOCALE },
            ],
          },
        }),
      ]);

      if (scope || existingCount > 0) {
        throw new CmsContentError(
          "CONFLICT",
          "FAQ CMS is already initialized for English content.",
        );
      }

      const now = new Date();
      const createdIds: string[] = [];

      for (const [index, faq] of generalFaqs.entries()) {
        const payload = cmsPayloadSchemas.FAQ.parse({
          question: faq.question,
          answer: faq.answer,
          category: "General",
        }) as Prisma.InputJsonValue;
        const item = await tx.cmsContentItem.create({
          data: {
            type: "FAQ",
            key: `faq-${String(index + 1).padStart(3, "0")}`,
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
        createdIds.push(item.id);
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
      }

      await tx.cmsContentScope.create({
        data: {
          type: "FAQ",
          market: FAQ_MARKET,
          locale: FAQ_LOCALE,
        },
      });

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
            count: createdIds.length,
          } as Prisma.InputJsonValue,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
      });

      return { count: createdIds.length, market: FAQ_MARKET, locale: FAQ_LOCALE };
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
