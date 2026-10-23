import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { CmsContentStatus, CmsContentType } from "@/generated/prisma/enums";
import { getOptionalPrisma, getPrisma } from "@/lib/prisma";
import { getOwnedFlightLocationCatalog } from "@/lib/locations/flightDiscovery";
import { hotelDestinations } from "@/data/hotelDestinations";
import { getHomeDiscoveryRouteAllowlist } from "@/data/homeDiscovery";
import { getPopularDestinationAllowlist, popularDestinationsByMarket } from "@/data/marketHomeContent";
import { resolveHotelDiscoveryIntent } from "@/lib/hotels/hotelDiscoveryIntent";
import { HOMEPAGE_REFRESH_MARKET_CODES } from "@/lib/market/resolveMarket";
import { imageRemotePatterns, matchesImagePattern } from "@/config/imagePatterns";

export const cmsContentTypes = [
  "HOMEPAGE_DESTINATION",
  "FLIGHT_ROUTE",
  "HOTEL_DESTINATION",
  "FAQ",
] as const satisfies readonly CmsContentType[];

const cmsContentStatuses = ["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"] as const satisfies readonly CmsContentStatus[];
export const cmsMarketCodes = HOMEPAGE_REFRESH_MARKET_CODES;
const cmsMarketCodeSet = new Set<string>(cmsMarketCodes);
const cmsCursorId = /^[A-Za-z0-9_-]{6,128}$/;
const cmsCursorIso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

type CmsListScope = {
  type: CmsContentType | null;
  status: CmsContentStatus | null;
  market: string | null;
  locale: string | null;
};

function encodeCmsListCursor(scope: CmsListScope, updatedAt: string, id: string) {
  return Buffer.from(JSON.stringify({ v: 1, scope, updatedAt, id }), "utf8").toString("base64url");
}

function decodeCmsListCursor(value: string | undefined): { scope: CmsListScope; updatedAt: string; id: string } | null {
  if (!value) return null;
  if (value.length > 2048) throw new CmsContentError("INVALID", "CMS cursor is malformed.", { field: "cursor" });
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    const scope = decoded.scope as Partial<CmsListScope> | undefined;
    const type = scope?.type ?? null;
    const status = scope?.status ?? null;
    const market = scope?.market ?? null;
    const locale = scope?.locale ?? null;
    if (
      decoded.v !== 1 ||
      !scope ||
      (type !== null && !cmsContentTypes.includes(type as CmsContentType)) ||
      (status !== null && !cmsContentStatuses.includes(status as CmsContentStatus)) ||
      (market !== null && (typeof market !== "string" || !cmsMarketCodeSet.has(market))) ||
      (locale !== null && (typeof locale !== "string" || !/^[a-z]{2}(?:-[a-z]{2})?$/.test(locale))) ||
      typeof decoded.updatedAt !== "string" ||
      !cmsCursorIso.test(decoded.updatedAt) ||
      !Number.isFinite(Date.parse(decoded.updatedAt)) ||
      typeof decoded.id !== "string" ||
      !cmsCursorId.test(decoded.id)
    ) {
      throw new Error("invalid");
    }
    return {
      scope: { type: type as CmsContentType | null, status: status as CmsContentStatus | null, market, locale },
      updatedAt: new Date(decoded.updatedAt).toISOString(),
      id: decoded.id,
    };
  } catch (error) {
    if (error instanceof CmsContentError) throw error;
    throw new CmsContentError("INVALID", "CMS cursor is malformed.", { field: "cursor" });
  }
}

function rethrowCmsWriteConflict(error: unknown, duplicateMessage: string, concurrencyMessage: string): never {
  if (error instanceof CmsContentError) throw error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") throw new CmsContentError("CONFLICT", duplicateMessage);
    if (error.code === "P2034") throw new CmsContentError("CONFLICT", concurrencyMessage);
  }
  throw error;
}

const printable = (max: number) =>
  z.string().trim().min(1).max(max).refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Control characters are not allowed.");

const airportCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3}$/);
const countryCode = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/);
const safeImage = z.string().trim().max(2000).refine((value) => {
  if (value.startsWith("/images/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && imageRemotePatterns.some((pattern) => matchesImagePattern(url, pattern));
  } catch {
    return false;
  }
}, "Use an approved local image path or an image URL allowed by the application image configuration.");

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
    canonicalId: printable(160),
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
const marketSchema = z.string().trim().toUpperCase().refine(
  (value) => cmsMarketCodeSet.has(value),
  "Use a supported Kurioticket content market code.",
);
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

const ownedFlightAirportCodes = new Set(
  getOwnedFlightLocationCatalog()
    .map((location) => location.codes?.iata)
    .filter((code): code is string => Boolean(code)),
);
const canonicalHotelDestinationIds = new Set(
  hotelDestinations.map((destination) => `hotel:${destination.id}`),
);
const supportedHomepageDestinationRoutes = new Set(
  [...getPopularDestinationAllowlist().values()].map(
    (destination) => `${destination.originCode}:${destination.code}`,
  ),
);
const supportedHomepageDestinationEntries = new Set(
  Object.values(popularDestinationsByMarket)
    .flat()
    .map((destination) => [
      destination.city.trim().toLowerCase(),
      destination.country.trim().toLowerCase(),
      destination.originCode,
      destination.code,
    ].join("|")),
);
const supportedHomepageFlightRoutes = new Set(
  [...getHomeDiscoveryRouteAllowlist().values()].map(
    (route) => `${route.originCode}:${route.destinationCode}`,
  ),
);

function parsePayload(type: CmsContentType, payload: unknown) {
  const parsed = cmsPayloadSchemas[type].safeParse(payload);
  if (!parsed.success) throw new CmsContentError("INVALID", "Content payload is invalid.", parsed.error.flatten());

  if (type === "HOMEPAGE_DESTINATION" || type === "FLIGHT_ROUTE") {
    const route = parsed.data as { originCode: string; destinationCode: string };
    if (!ownedFlightAirportCodes.has(route.originCode) || !ownedFlightAirportCodes.has(route.destinationCode)) {
      throw new CmsContentError("INVALID", "Homepage flight content must use airport codes from the owned Kurioticket flight catalog.");
    }
    const routeKey = `${route.originCode}:${route.destinationCode}`;
    const supported = type === "HOMEPAGE_DESTINATION"
      ? supportedHomepageDestinationRoutes.has(routeKey)
      : supportedHomepageFlightRoutes.has(routeKey);
    if (!supported) {
      throw new CmsContentError(
        "INVALID",
        "Homepage content must use an existing Kurioticket fare-supported route.",
      );
    }
  }

  if (type === "HOMEPAGE_DESTINATION") {
    const destination = parsed.data as {
      city: string;
      country: string;
      originCode: string;
      destinationCode: string;
    };
    const destinationKey = [
      destination.city.trim().toLowerCase(),
      destination.country.trim().toLowerCase(),
      destination.originCode,
      destination.destinationCode,
    ].join("|");
    if (!supportedHomepageDestinationEntries.has(destinationKey)) {
      throw new CmsContentError(
        "INVALID",
        "Homepage destination label and fare route must match the same canonical Kurioticket destination entry.",
      );
    }
    if (!resolveHotelDiscoveryIntent(`${destination.city}, ${destination.country}`, "home-popular-stays")) {
      throw new CmsContentError(
        "INVALID",
        "Homepage destination must resolve to a canonical Kurioticket hotel destination.",
      );
    }
  }

  if (type === "HOTEL_DESTINATION") {
    const hotel = parsed.data as { canonicalId: string };
    if (!canonicalHotelDestinationIds.has(hotel.canonicalId)) {
      throw new CmsContentError("INVALID", "Hotel destination must use a canonical Kurioticket hotel destination id.");
    }
  }

  return parsed.data as Prisma.InputJsonValue;
}


export function validateCmsPayloadIntegrity(type: CmsContentType, payload: unknown) {
  try {
    parsePayload(type, payload);
    return { valid: true as const, issues: null };
  } catch (error) {
    if (error instanceof CmsContentError) {
      return {
        valid: false as const,
        issues: error.issues ?? { message: error.message },
      };
    }
    throw error;
  }
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
    action: "CREATED" | "UPDATED" | "PUBLISHED" | "HIDDEN" | "ARCHIVED" | "RESTORED" | "ORDER_NORMALIZED";
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
      const scope = await tx.cmsContentScope.findUnique({
        where: {
          type_market_locale: {
            type: parsed.data.type,
            market: parsed.data.market,
            locale: parsed.data.locale,
          },
        },
        select: {
        id: true,
        version: true,
        legacyFallbackRetiredAt: true,
        legacyFallbackRetiredByAdminUserId: true,
      },
      });
      if (!scope) {
        throw new CmsContentError(
          "CONFLICT",
          "Initialize this CMS content scope before creating new records.",
        );
      }

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
    rethrowCmsWriteConflict(
      error,
      "Content with this type, key, market and locale already exists.",
      "Content changed concurrently. Refresh and try again.",
    );
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
    rethrowCmsWriteConflict(
      error,
      "Another content item already uses this type, key, market and locale.",
      "Content changed concurrently. Refresh before saving.",
    );
  }
}

const restoreSchema = z.object({
  expectedVersion: z.number().int().min(1),
  revisionId: z.string().trim().min(1).max(128),
}).strict();

export async function restoreCmsContentRevision(
  id: string,
  raw: unknown,
  actorInput: CmsActor,
) {
  const parsed = restoreSchema.safeParse(raw);
  if (!parsed.success) throw new CmsContentError("INVALID", "Restore request is invalid.", parsed.error.flatten());
  const actor = normalizeActor(actorInput);

  try {
    return await getPrisma().$transaction(async (tx) => {
      const existing = await tx.cmsContentItem.findUnique({ where: { id } });
      if (!existing) throw new CmsContentError("NOT_FOUND", "Content item not found.");
      if (existing.status === "ARCHIVED") throw new CmsContentError("ARCHIVED", "Archived content cannot be restored in place.");

      const revision = await tx.cmsContentRevision.findFirst({
        where: { id: parsed.data.revisionId, contentItemId: id },
      });
      if (!revision) throw new CmsContentError("NOT_FOUND", "Content revision not found.");

      const restoredMarket = marketSchema.safeParse(revision.market);
      const restoredLocale = localeSchema.safeParse(revision.locale);
      if (!restoredMarket.success || !restoredLocale.success) {
        throw new CmsContentError(
          "INVALID",
          "This historical revision uses a CMS scope that is no longer supported.",
        );
      }
      const restoredPayload = parsePayload(existing.type, revision.draftPayload);
      const nextVersion = parsed.data.expectedVersion + 1;
      const changed = await tx.cmsContentItem.updateMany({
        where: { id, version: parsed.data.expectedVersion, status: { not: "ARCHIVED" } },
        data: {
          draftPayload: restoredPayload,
          market: restoredMarket.data,
          locale: restoredLocale.data,
          sortOrder: revision.sortOrder,
          version: { increment: 1 },
          updatedByAdminUserId: actor.id,
        },
      });
      if (changed.count !== 1) {
        throw new CmsContentError("CONFLICT", "Content changed since it was opened. Refresh before restoring.");
      }

      const item = await tx.cmsContentItem.findUniqueOrThrow({ where: { id } });
      await createRevisionAndAudit(tx, {
        itemId: item.id,
        version: nextVersion,
        action: "RESTORED",
        status: item.status,
        market: item.market,
        locale: item.locale,
        sortOrder: item.sortOrder,
        publishedMarket: item.publishedMarket,
        publishedLocale: item.publishedLocale,
        publishedSortOrder: item.publishedSortOrder,
        draftPayload: restoredPayload,
        publishedPayload: item.publishedPayload === null ? null : item.publishedPayload as Prisma.InputJsonValue,
        actor,
        auditAction: "CMS_CONTENT_RESTORED",
        type: item.type,
        key: item.key,
      });
      return serialize(item);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    rethrowCmsWriteConflict(
      error,
      "Another content item already uses this restored scope identity.",
      "Content changed concurrently. Refresh before restoring.",
    );
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
    const nextVersion = parsed.data.expectedVersion + 1;
    const data = transition === "PUBLISHED"
      ? {
          status: "PUBLISHED" as const,
          publishedPayload: parsePayload(existing.type, existing.draftPayload),
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
    rethrowCmsWriteConflict(
      error,
      "Another published content item already uses this type, key, market and locale.",
      "Content changed concurrently. Refresh before publishing.",
    );
  }
}

export async function listAdminCmsContent(input: {
  type?: CmsContentType;
  status?: CmsContentStatus;
  market?: string;
  locale?: string;
  limit?: number;
  cursor?: string;
} = {}) {
  const db = getOptionalPrisma();
  if (!db) throw new CmsContentError("UNAVAILABLE", "CMS storage is unavailable.");

  const cursor = decodeCmsListCursor(input.cursor);
  const parsedMarket = input.market ? marketSchema.safeParse(input.market) : null;
  if (parsedMarket && !parsedMarket.success) throw new CmsContentError("INVALID", "Market filter is invalid.", parsedMarket.error.flatten());
  const parsedLocale = input.locale ? localeSchema.safeParse(input.locale) : null;
  if (parsedLocale && !parsedLocale.success) throw new CmsContentError("INVALID", "Locale filter is invalid.", parsedLocale.error.flatten());
  const limit = input.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new CmsContentError("INVALID", "Limit must be an integer from 1 to 100.", { field: "limit" });
  }

  const scope: CmsListScope = {
    type: input.type ?? cursor?.scope.type ?? null,
    status: input.status ?? cursor?.scope.status ?? null,
    market: parsedMarket?.success ? parsedMarket.data : cursor?.scope.market ?? null,
    locale: parsedLocale?.success ? parsedLocale.data : cursor?.scope.locale ?? null,
  };
  if (cursor && JSON.stringify(cursor.scope) !== JSON.stringify(scope)) {
    throw new CmsContentError("INVALID", "CMS cursor does not match this query.", { field: "cursor" });
  }

  const rows = await db.cmsContentItem.findMany({
    where: {
      ...(scope.type ? { type: scope.type } : {}),
      ...(scope.status ? { status: scope.status } : {}),
      ...(scope.market ? { market: scope.market } : {}),
      ...(scope.locale ? { locale: scope.locale } : {}),
      ...(cursor
        ? {
            OR: [
              { updatedAt: { lt: new Date(cursor.updatedAt) } },
              { updatedAt: new Date(cursor.updatedAt), id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const nextCursor = rows.length > limit && last
    ? encodeCmsListCursor(scope, last.updatedAt.toISOString(), last.id)
    : null;

  return { items: page.map(serialize), nextCursor };
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
  if (!db) {
    console.warn("[cms:public-fallback]", { type, reason: "storage_unavailable" });
    return { source: "fallback", items: options.fallback() };
  }
  try {
    const market = marketSchema.parse(options.market ?? "GLOBAL");
    const locale = localeSchema.parse(options.locale ?? "en");
    const [scope, rows] = await Promise.all([
      db.cmsContentScope.findUnique({
        where: { type_market_locale: { type, market, locale } },
        select: {
          id: true,
          legacyFallbackRetiredAt: true,
        },
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
    if (!scope && !rows.length) {
      console.warn("[cms:public-fallback]", {
        type,
        market,
        locale,
        reason: "scope_uninitialized",
      });
      return { source: "fallback", items: options.fallback() };
    }
    const visibleRows = rows.filter((row) => row.status === "PUBLISHED");
    const items: T[] = [];
    for (const row of visibleRows) {
      const parsed = cmsPayloadSchemas[type].safeParse(row.publishedPayload);
      if (!parsed.success) {
        console.error("[cms:public-read-invalid-payload]", { type, market, locale });
        if (scope?.legacyFallbackRetiredAt) {
          return { source: "cms", items: [] };
        }
        console.warn("[cms:public-fallback]", {
          type,
          market,
          locale,
          reason: "invalid_published_payload",
        });
        return { source: "fallback", items: options.fallback() };
      }
      items.push({ id: row.key, ...(parsed.data as Record<string, unknown>) } as T);
    }
    return { source: "cms", items };
  } catch (error) {
    console.error("[cms:public-read]", { type, errorName: error instanceof Error ? error.name : "unknown" });
    console.warn("[cms:public-fallback]", { type, reason: "read_error" });
    return { source: "fallback", items: options.fallback() };
  }
}


export async function getCmsContentScopeSummary(
  type: CmsContentType,
  market: string,
  locale: string,
) {
  const db = getOptionalPrisma();
  if (!db) {
    return {
      available: false,
      active: false,
      scopeVersion: null,
      legacyFallbackRetired: false,
      legacyFallbackRetiredAt: null,
      total: 0,
      draft: 0,
      published: 0,
      hidden: 0,
      archived: 0,
    };
  }
  const parsedMarket = marketSchema.safeParse(market);
  const parsedLocale = localeSchema.safeParse(locale);
  if (!parsedMarket.success || !parsedLocale.success) {
    throw new CmsContentError("INVALID", "CMS scope is invalid.");
  }
  const [scope, groups] = await Promise.all([
    db.cmsContentScope.findUnique({
      where: {
        type_market_locale: {
          type,
          market: parsedMarket.data,
          locale: parsedLocale.data,
        },
      },
      select: {
        id: true,
        version: true,
        legacyFallbackRetiredAt: true,
        legacyFallbackRetiredByAdminUserId: true,
      },
    }),
    db.cmsContentItem.groupBy({
      by: ["status"],
      where: {
        type,
        OR: [
          { market: parsedMarket.data, locale: parsedLocale.data },
          { publishedMarket: parsedMarket.data, publishedLocale: parsedLocale.data },
        ],
      },
      _count: { _all: true },
    }),
  ]);
  const counts = new Map(groups.map((group) => [group.status, group._count._all]));
  return {
    available: true,
    active: Boolean(scope),
    scopeVersion: scope?.version ?? null,
    legacyFallbackRetired: Boolean(scope?.legacyFallbackRetiredAt),
    legacyFallbackRetiredAt: scope?.legacyFallbackRetiredAt?.toISOString() ?? null,
    total: groups.reduce((sum, group) => sum + group._count._all, 0),
    draft: counts.get("DRAFT") ?? 0,
    published: counts.get("PUBLISHED") ?? 0,
    hidden: counts.get("HIDDEN") ?? 0,
    archived: counts.get("ARCHIVED") ?? 0,
  };
}
