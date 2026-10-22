import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { CmsContentStatus, CmsContentType } from "@/generated/prisma/enums";
import { getOptionalPrisma, getPrisma } from "@/lib/prisma";

export const cmsContentTypes = [
  "HOMEPAGE_DESTINATION",
  "FLIGHT_ROUTE",
  "HOTEL_DESTINATION",
  "FAQ",
] as const satisfies readonly CmsContentType[];

const printable = (max: number) =>
  z.string().trim().min(1).max(max).refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Control characters are not allowed.");

const airportCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3}$/);
const countryCode = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/);
const safeImage = z.string().trim().max(2000).refine((value) => {
  if (value.startsWith("/images/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}, "Use an approved local image path or HTTPS image URL.");

export const cmsPayloadSchemas = {
  HOMEPAGE_DESTINATION: z.object({
    city: printable(120),
    country: printable(120),
    countryCode: countryCode.optional(),
    destinationCode: airportCode,
    originCode: airportCode,
    image: safeImage,
    imageAlt: printable(240),
  }).strict(),
  FLIGHT_ROUTE: z.object({
    title: printable(160),
    originCity: printable(120),
    originCode: airportCode,
    destinationCity: printable(120),
    destinationCode: airportCode,
    routeNote: printable(300),
    image: safeImage,
    imageAlt: printable(240),
  }).strict().refine((value) => value.originCode !== value.destinationCode, {
    message: "Origin and destination must be different.",
    path: ["destinationCode"],
  }),
  HOTEL_DESTINATION: z.object({
    name: printable(120),
    country: printable(120),
    countryCode,
    kind: z.enum(["city", "district", "landmark", "airport-area", "custom"]),
    searchValue: printable(160),
    canonicalId: printable(160).optional(),
    image: safeImage.optional(),
    imageAlt: printable(240).optional(),
  }).strict(),
  FAQ: z.object({
    question: printable(240),
    answer: printable(5000),
    category: printable(80).default("General"),
  }).strict(),
} satisfies Record<CmsContentType, z.ZodTypeAny>;

const keySchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120);
const marketSchema = z.string().trim().toUpperCase().refine((value) => value === "GLOBAL" || /^[A-Z]{2}$/.test(value), "Use GLOBAL or a two-letter market code.");
const localeSchema = z.string().trim().toLowerCase().regex(/^[a-z]{2}(?:-[a-z]{2})?$/).max(10);
const sortOrderSchema = z.number().int().min(0).max(100000);

const createSchema = z.object({
  type: z.enum(cmsContentTypes),
  key: keySchema,
  market: marketSchema.default("GLOBAL"),
  locale: localeSchema.default("en"),
  sortOrder: sortOrderSchema.default(0),
  payload: z.unknown(),
}).strict();

const draftUpdateSchema = z.object({
  expectedVersion: z.number().int().min(1),
  payload: z.unknown(),
  market: marketSchema.optional(),
  locale: localeSchema.optional(),
  sortOrder: sortOrderSchema.optional(),
}).strict();

const transitionSchema = z.object({
  expectedVersion: z.number().int().min(1),
}).strict();

export type CmsActor = {
  id: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
};

export class CmsContentError extends Error {
  constructor(
    readonly code: "INVALID" | "NOT_FOUND" | "CONFLICT" | "ARCHIVED" | "UNAVAILABLE",
    message: string,
    readonly issues?: unknown,
  ) {
    super(message);
    this.name = "CmsContentError";
  }
}

function parsePayload(type: CmsContentType, payload: unknown) {
  const parsed = cmsPayloadSchemas[type].safeParse(payload);
  if (!parsed.success) throw new CmsContentError("INVALID", "Content payload is invalid.", parsed.error.flatten());
  return parsed.data as Prisma.InputJsonValue;
}

function normalizeActor(actor: CmsActor) {
  return { ...actor, email: actor.email.trim().toLowerCase() };
}

function serialize(item: {
  id: string;
  type: CmsContentType;
  key: string;
  status: CmsContentStatus;
  market: string;
  locale: string;
  sortOrder: number;
  publishedMarket: string | null;
  publishedLocale: string | null;
  publishedSortOrder: number | null;
  draftPayload: unknown;
  publishedPayload: unknown;
  version: number;
  publishedVersion: number | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...item,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    archivedAt: item.archivedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

async function createRevisionAndAudit(
  tx: Prisma.TransactionClient,
  input: {
    itemId: string;
    version: number;
    action: "CREATED" | "UPDATED" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
    status: CmsContentStatus;
    market: string;
    locale: string;
    sortOrder: number;
    publishedMarket?: string | null;
    publishedLocale?: string | null;
    publishedSortOrder?: number | null;
    draftPayload: Prisma.InputJsonValue;
    publishedPayload?: Prisma.InputJsonValue | null;
    actor: CmsActor;
    auditAction: string;
    type: CmsContentType;
    key: string;
  },
) {
  const actor = normalizeActor(input.actor);
  await tx.cmsContentRevision.create({
    data: {
      contentItemId: input.itemId,
      version: input.version,
      action: input.action,
      status: input.status,
      market: input.market,
      locale: input.locale,
      sortOrder: input.sortOrder,
      publishedMarket: input.publishedMarket,
      publishedLocale: input.publishedLocale,
      publishedSortOrder: input.publishedSortOrder,
      draftPayload: input.draftPayload,
      publishedPayload: input.publishedPayload === undefined
        ? undefined
        : input.publishedPayload === null
          ? Prisma.DbNull
          : input.publishedPayload,
      actorUserId: actor.id,
      actorEmail: actor.email,
    },
  });
  await tx.adminAuditLog.create({
    data: {
      adminUserId: actor.id,
      adminEmail: actor.email,
      action: input.auditAction,
      targetType: "CmsContentItem",
      targetId: input.itemId,
      metadata: {
        type: input.type,
        key: input.key,
        version: input.version,
        status: input.status,
        market: input.market,
        locale: input.locale,
      } as Prisma.InputJsonValue,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    },
  });
}

export async function createCmsContent(raw: unknown, actorInput: CmsActor) {
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) throw new CmsContentError("INVALID", "Content request is invalid.", parsed.error.flatten());
  const actor = normalizeActor(actorInput);
  const payload = parsePayload(parsed.data.type, parsed.data.payload);
  try {
    return await getPrisma().$transaction(async (tx) => {
      const item = await tx.cmsContentItem.create({
        data: {
          type: parsed.data.type,
          key: parsed.data.key,
          market: parsed.data.market,
          locale: parsed.data.locale,
          sortOrder: parsed.data.sortOrder,
          draftPayload: payload,
          createdByAdminUserId: actor.id,
          updatedByAdminUserId: actor.id,
        },
      });
      await createRevisionAndAudit(tx, {
        itemId: item.id, version: item.version, action: "CREATED", status: item.status,
        market: item.market, locale: item.locale, sortOrder: item.sortOrder,
        publishedMarket: null, publishedLocale: null, publishedSortOrder: null,
        draftPayload: payload, publishedPayload: null,
        actor, auditAction: "CMS_CONTENT_CREATED", type: item.type, key: item.key,
      });
      return serialize(item);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof CmsContentError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new CmsContentError("CONFLICT", "Content with this type, key, market and locale already exists.");
    }
    throw error;
  }
}

export async function updateCmsContentDraft(id: string, raw: unknown, actorInput: CmsActor) {
  const parsed = draftUpdateSchema.safeParse(raw);
  if (!parsed.success) throw new CmsContentError("INVALID", "Content update is invalid.", parsed.error.flatten());
  const actor = normalizeActor(actorInput);
  try {
    return await getPrisma().$transaction(async (tx) => {
    const existing = await tx.cmsContentItem.findUnique({ where: { id } });
    if (!existing) throw new CmsContentError("NOT_FOUND", "Content item not found.");
    if (existing.status === "ARCHIVED") throw new CmsContentError("ARCHIVED", "Archived content cannot be edited.");
    const payload = parsePayload(existing.type, parsed.data.payload);
    const nextVersion = parsed.data.expectedVersion + 1;
    const updated = await tx.cmsContentItem.updateMany({
      where: { id, version: parsed.data.expectedVersion, status: { not: "ARCHIVED" } },
      data: {
        draftPayload: payload,
        market: parsed.data.market ?? existing.market,
        locale: parsed.data.locale ?? existing.locale,
        sortOrder: parsed.data.sortOrder ?? existing.sortOrder,
        version: { increment: 1 },
        updatedByAdminUserId: actor.id,
      },
    });
    if (updated.count !== 1) throw new CmsContentError("CONFLICT", "Content changed since it was opened. Refresh before saving.");
    const item = await tx.cmsContentItem.findUniqueOrThrow({ where: { id } });
    await createRevisionAndAudit(tx, {
      itemId: item.id, version: nextVersion, action: "UPDATED", status: item.status,
      market: item.market, locale: item.locale, sortOrder: item.sortOrder,
      publishedMarket: item.publishedMarket,
      publishedLocale: item.publishedLocale,
      publishedSortOrder: item.publishedSortOrder,
      draftPayload: payload,
      publishedPayload: item.publishedPayload === null ? null : item.publishedPayload as Prisma.InputJsonValue,
      actor, auditAction: "CMS_CONTENT_UPDATED", type: item.type, key: item.key,
    });
      return serialize(item);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof CmsContentError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new CmsContentError("CONFLICT", "Another content item already uses this type, key, market and locale.");
    }
    throw error;
  }
}

export async function publishCmsContent(id: string, raw: unknown, actorInput: CmsActor) {
  return transitionCmsContent(id, raw, actorInput, "PUBLISHED");
}

export async function hideCmsContent(id: string, raw: unknown, actorInput: CmsActor) {
  return transitionCmsContent(id, raw, actorInput, "HIDDEN");
}

export async function archiveCmsContent(id: string, raw: unknown, actorInput: CmsActor) {
  return transitionCmsContent(id, raw, actorInput, "ARCHIVED");
}

async function transitionCmsContent(
  id: string,
  raw: unknown,
  actorInput: CmsActor,
  transition: "PUBLISHED" | "HIDDEN" | "ARCHIVED",
) {
  const parsed = transitionSchema.safeParse(raw);
  if (!parsed.success) throw new CmsContentError("INVALID", "Content transition is invalid.", parsed.error.flatten());
  const actor = normalizeActor(actorInput);
  try {
    return await getPrisma().$transaction(async (tx) => {
    const existing = await tx.cmsContentItem.findUnique({ where: { id } });
    if (!existing) throw new CmsContentError("NOT_FOUND", "Content item not found.");
    if (existing.status === "ARCHIVED") throw new CmsContentError("ARCHIVED", "Archived content cannot be changed.");
    const payload = parsePayload(existing.type, existing.draftPayload);
    const nextVersion = parsed.data.expectedVersion + 1;
    const data = transition === "PUBLISHED"
      ? {
          status: "PUBLISHED" as const,
          publishedPayload: payload,
          publishedMarket: existing.market,
          publishedLocale: existing.locale,
          publishedSortOrder: existing.sortOrder,
          publishedVersion: nextVersion,
          publishedAt: new Date(),
          publishedByAdminUserId: actor.id,
          archivedAt: null,
          version: { increment: 1 },
          updatedByAdminUserId: actor.id,
        }
      : transition === "HIDDEN"
        ? {
            status: "HIDDEN" as const,
            version: { increment: 1 },
            updatedByAdminUserId: actor.id,
          }
        : {
            status: "ARCHIVED" as const,
            archivedAt: new Date(),
            version: { increment: 1 },
            updatedByAdminUserId: actor.id,
          };

    if (transition === "PUBLISHED") {
      await tx.cmsContentScope.upsert({
        where: {
          type_market_locale: {
            type: existing.type,
            market: existing.market,
            locale: existing.locale,
          },
        },
        update: {},
        create: {
          type: existing.type,
          market: existing.market,
          locale: existing.locale,
        },
      });
      if (
        existing.publishedMarket &&
        existing.publishedLocale &&
        (existing.publishedMarket !== existing.market || existing.publishedLocale !== existing.locale)
      ) {
        await tx.cmsContentScope.upsert({
          where: {
            type_market_locale: {
              type: existing.type,
              market: existing.publishedMarket,
              locale: existing.publishedLocale,
            },
          },
          update: {},
          create: {
            type: existing.type,
            market: existing.publishedMarket,
            locale: existing.publishedLocale,
          },
        });
      }
    }

    const changed = await tx.cmsContentItem.updateMany({
      where: { id, version: parsed.data.expectedVersion, status: { not: "ARCHIVED" } },
      data,
    });
    if (changed.count !== 1) throw new CmsContentError("CONFLICT", "Content changed since it was opened. Refresh before publishing.");
    const item = await tx.cmsContentItem.findUniqueOrThrow({ where: { id } });
    const action = transition === "PUBLISHED" ? "PUBLISHED" : transition === "HIDDEN" ? "HIDDEN" : "ARCHIVED";
    await createRevisionAndAudit(tx, {
      itemId: item.id, version: nextVersion, action, status: item.status,
      market: item.market, locale: item.locale, sortOrder: item.sortOrder,
      publishedMarket: item.publishedMarket,
      publishedLocale: item.publishedLocale,
      publishedSortOrder: item.publishedSortOrder,
      draftPayload: item.draftPayload as Prisma.InputJsonValue,
      publishedPayload: item.publishedPayload === null ? null : item.publishedPayload as Prisma.InputJsonValue,
      actor, auditAction: `CMS_CONTENT_${action}`, type: item.type, key: item.key,
    });
      return serialize(item);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof CmsContentError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new CmsContentError("CONFLICT", "Another published content item already uses this type, key, market and locale.");
    }
    throw error;
  }
}

export async function listAdminCmsContent(input: {
  type?: CmsContentType;
  status?: CmsContentStatus;
  market?: string;
  locale?: string;
} = {}) {
  const db = getOptionalPrisma();
  if (!db) throw new CmsContentError("UNAVAILABLE", "CMS storage is unavailable.");
  const parsedMarket = input.market ? marketSchema.safeParse(input.market) : null;
  if (parsedMarket && !parsedMarket.success) throw new CmsContentError("INVALID", "Market filter is invalid.", parsedMarket.error.flatten());
  const parsedLocale = input.locale ? localeSchema.safeParse(input.locale) : null;
  if (parsedLocale && !parsedLocale.success) throw new CmsContentError("INVALID", "Locale filter is invalid.", parsedLocale.error.flatten());
  const items = await db.cmsContentItem.findMany({
    where: {
      ...(input.type ? { type: input.type } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(parsedMarket?.success ? { market: parsedMarket.data } : {}),
      ...(parsedLocale?.success ? { locale: parsedLocale.data } : {}),
    },
    orderBy: [{ type: "asc" }, { market: "asc" }, { locale: "asc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
    take: 200,
  });
  return items.map(serialize);
}

export async function getAdminCmsContent(id: string) {
  const db = getOptionalPrisma();
  if (!db) throw new CmsContentError("UNAVAILABLE", "CMS storage is unavailable.");
  const item = await db.cmsContentItem.findUnique({
    where: { id },
    include: { revisions: { orderBy: { version: "desc" }, take: 50 } },
  });
  if (!item) throw new CmsContentError("NOT_FOUND", "Content item not found.");
  return {
    item: serialize(item),
    revisions: item.revisions.map((revision) => ({
      id: revision.id,
      version: revision.version,
      action: revision.action,
      status: revision.status,
      market: revision.market,
      locale: revision.locale,
      sortOrder: revision.sortOrder,
      publishedMarket: revision.publishedMarket,
      publishedLocale: revision.publishedLocale,
      publishedSortOrder: revision.publishedSortOrder,
      draftPayload: revision.draftPayload,
      publishedPayload: revision.publishedPayload,
      actorEmail: revision.actorEmail,
      createdAt: revision.createdAt.toISOString(),
    })),
  };
}

export async function readPublishedCmsContent<T>(
  type: CmsContentType,
  options: { market?: string; locale?: string; fallback: () => T[] },
): Promise<{ source: "cms" | "fallback"; items: T[] }> {
  const db = getOptionalPrisma();
  if (!db) return { source: "fallback", items: options.fallback() };
  try {
    const market = marketSchema.parse(options.market ?? "GLOBAL");
    const locale = localeSchema.parse(options.locale ?? "en");
    const [scope, rows] = await Promise.all([
      db.cmsContentScope.findUnique({
        where: { type_market_locale: { type, market, locale } },
        select: { id: true },
      }),
      db.cmsContentItem.findMany({
      where: {
        type,
        publishedMarket: market,
        publishedLocale: locale,
        publishedPayload: { not: Prisma.DbNull },
      },
      orderBy: [{ publishedSortOrder: "asc" }, { key: "asc" }],
      select: { key: true, status: true, publishedPayload: true },
      }),
    ]);
    if (!scope && !rows.length) return { source: "fallback", items: options.fallback() };
    const visibleRows = rows.filter((row) => row.status === "PUBLISHED");
    const items: T[] = [];
    for (const row of visibleRows) {
      const parsed = cmsPayloadSchemas[type].safeParse(row.publishedPayload);
      if (!parsed.success) {
        console.error("[cms:public-read-invalid-payload]", { type });
        return { source: "fallback", items: options.fallback() };
      }
      items.push({ id: row.key, ...(parsed.data as Record<string, unknown>) } as T);
    }
    return { source: "cms", items };
  } catch (error) {
    console.error("[cms:public-read]", { type, errorName: error instanceof Error ? error.name : "unknown" });
    return { source: "fallback", items: options.fallback() };
  }
}
