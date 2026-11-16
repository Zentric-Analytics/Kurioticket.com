import { sortCmsFaqDirectory } from "@/lib/cmsDirectoryPresentation";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { CmsContentStatus, CmsContentType } from "@/generated/prisma/enums";
import { getOptionalPrisma, getPrisma } from "@/lib/prisma";
import { getOwnedFlightLocationCatalog } from "@/lib/locations/flightDiscovery";
import { hotelDestinations } from "@/data/hotelDestinations";
import { getHomeDiscoveryRouteAllowlist } from "@/data/homeDiscovery";
import { getPopularDestinationAllowlist, popularDestinationsByMarket } from "@/data/marketHomeContent";
import { resolveHotelDiscoveryIntent } from "@/lib/hotels/hotelDiscoveryIntent";
import { cmsHotelCanonicalId, getCmsHotelMetadataMismatch, homepageDestinationHotelCanonicalId } from "@/lib/cmsHotelIntegrity";
import { HOMEPAGE_REFRESH_MARKET_CODES } from "@/lib/market/resolveMarket";
import { cmsPayloadSchemas, cmsSortOrderSchema } from "@/lib/cmsContentValidation";
export { cmsPayloadSchemas } from "@/lib/cmsContentValidation";

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
  search: string | null;
  category: string | null;
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
    const search = scope?.search ?? null;
    const category = scope?.category ?? null;
    if (
      decoded.v !== 1 ||
      !scope ||
      (type !== null && !cmsContentTypes.includes(type as CmsContentType)) ||
      (status !== null && !cmsContentStatuses.includes(status as CmsContentStatus)) ||
      (market !== null && (typeof market !== "string" || !cmsMarketCodeSet.has(market))) ||
      (locale !== null && (typeof locale !== "string" || !/^[a-z]{2}(?:-[a-z]{2})?$/.test(locale))) ||
      (search !== null && (typeof search !== "string" || search.length > 160 || /[\x00-\x1f\x7f]/.test(search))) ||
      (category !== null && (typeof category !== "string" || category.length > 80 || /[\x00-\x1f\x7f]/.test(category))) ||
      typeof decoded.updatedAt !== "string" ||
      !cmsCursorIso.test(decoded.updatedAt) ||
      !Number.isFinite(Date.parse(decoded.updatedAt)) ||
      typeof decoded.id !== "string" ||
      !cmsCursorId.test(decoded.id)
    ) {
      throw new Error("invalid");
    }
    return {
      scope: { type: type as CmsContentType | null, status: status as CmsContentStatus | null, market, locale, search, category },
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


const keySchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120);
const marketSchema = z.string().trim().toUpperCase().refine(
  (value) => cmsMarketCodeSet.has(value),
  "Use a supported Kurioticket content market code.",
);
const localeSchema = z.string().trim().toLowerCase().regex(/^[a-z]{2}(?:-[a-z]{2})?$/).max(10);
const sortOrderSchema = cmsSortOrderSchema;

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

const homepageDestinationRoutePairs = [...getPopularDestinationAllowlist().values()].map(
  (destination) => ({
    originCode: destination.originCode,
    destinationCode: destination.code,
  }),
);
const homepageFlightRoutePairs = [...getHomeDiscoveryRouteAllowlist().values()].map(
  (route) => ({
    originCode: route.originCode,
    destinationCode: route.destinationCode,
  }),
);
const supportedHomepageDestinationRoutes = new Set(
  homepageDestinationRoutePairs.map(
    (route) => `${route.originCode}:${route.destinationCode}`,
  ),
);
const supportedHomepageFlightRoutes = new Set(
  homepageFlightRoutePairs.map(
    (route) => `${route.originCode}:${route.destinationCode}`,
  ),
);
const ownedFlightAirportCodes = new Set([
  ...getOwnedFlightLocationCatalog()
    .map((location) => location.codes?.iata)
    .filter((code): code is string => Boolean(code)),
  ...homepageDestinationRoutePairs.flatMap((route) => [route.originCode, route.destinationCode]),
  ...homepageFlightRoutePairs.flatMap((route) => [route.originCode, route.destinationCode]),
]);
const canonicalHotelDestinationIds = new Set(
  hotelDestinations.map((destination) => `hotel:${destination.id}`),
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

export function getCmsHomepageFlightRoutePairs(
  type: "HOMEPAGE_DESTINATION" | "FLIGHT_ROUTE",
) {
  const pairs = type === "HOMEPAGE_DESTINATION"
    ? homepageDestinationRoutePairs
    : homepageFlightRoutePairs;
  return [...new Map(
    pairs.map((route) => [
      `${route.originCode}:${route.destinationCode}`,
      route,
    ]),
  ).values()];
}

function parsePayload(type: CmsContentType, payload: unknown) {
  const parsed = cmsPayloadSchemas[type].safeParse(payload);
  if (!parsed.success) throw new CmsContentError("INVALID", "Content payload is invalid.", parsed.error.flatten());

  if (type === "HOMEPAGE_DESTINATION" || type === "FLIGHT_ROUTE") {
    const route = parsed.data as { originCode: string; destinationCode: string };
    const fieldErrors: Record<string, string[]> = {};
    if (!ownedFlightAirportCodes.has(route.originCode)) {
      fieldErrors.originCode = [
        `${route.originCode} is not in Kurioticket's supported homepage flight catalog.`,
      ];
    }
    if (!ownedFlightAirportCodes.has(route.destinationCode)) {
      fieldErrors.destinationCode = [
        `${route.destinationCode} is not in Kurioticket's supported homepage flight catalog.`,
      ];
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new CmsContentError(
        "INVALID",
        "Choose airport codes from Kurioticket's supported homepage flight catalog.",
        { formErrors: [], fieldErrors },
      );
    }

    const routeKey = `${route.originCode}:${route.destinationCode}`;
    const supported = type === "HOMEPAGE_DESTINATION"
      ? supportedHomepageDestinationRoutes.has(routeKey)
      : supportedHomepageFlightRoutes.has(routeKey);
    if (!supported) {
      throw new CmsContentError(
        "INVALID",
        `${route.originCode} → ${route.destinationCode} is not a fare-supported homepage route.`,
        {
          formErrors: [],
          fieldErrors: {
            destinationCode: [
              `Choose a destination that is supported from ${route.originCode}.`,
            ],
          },
        },
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
        {
          formErrors: [],
          fieldErrors: {
            city: ["Choose the city that belongs to this supported destination route."],
            destinationCode: ["Choose the IATA code for the same destination."],
          },
        },
      );
    }
    if (!resolveHotelDiscoveryIntent(`${destination.city}, ${destination.country}`, "home-popular-stays")) {
      throw new CmsContentError(
        "INVALID",
        "Homepage destination must resolve to a canonical Kurioticket hotel destination.",
        {
          formErrors: [],
          fieldErrors: {
            city: ["Choose a city that is available in the Kurioticket hotel destination catalog."],
          },
        },
      );
    }
  }

  if (type === "HOTEL_DESTINATION") {
    const hotel = parsed.data as { canonicalId: string; country: string; countryCode: string; kind: string; searchValue: string };
    if (!canonicalHotelDestinationIds.has(hotel.canonicalId)) {
      throw new CmsContentError("INVALID", "Hotel destination must use a canonical Kurioticket hotel destination id.");
    }
    const mismatch = getCmsHotelMetadataMismatch(hotel);
    if (mismatch) throw new CmsContentError("INVALID", mismatch);
  }

  return parsed.data as Prisma.InputJsonValue;
}



/** A published hotel record keeps its canonical identity for its entire lifecycle. */
function assertHotelIdentityNotChanged(existing: { type: CmsContentType; publishedPayload: unknown }, payload: unknown) {
  if (existing.type !== "HOTEL_DESTINATION") return;
  const publishedId = cmsHotelCanonicalId(existing.publishedPayload);
  if (publishedId && publishedId !== cmsHotelCanonicalId(payload)) {
    throw new CmsContentError(
      "CONFLICT",
      "This hotel destination is already published under a different canonical ID. Edit its image or display name, or create a separate record for another destination.",
    );
  }
}

/** This is checked in the same serializable transaction as CMS writes. */
async function assertUniqueHotelCanonicalId(tx: Prisma.TransactionClient, payload: unknown, excludeId?: string) {
  const canonicalId = cmsHotelCanonicalId(payload);
  if (!canonicalId) return;
  const siblings = await tx.cmsContentItem.findMany({
    where: { type: "HOTEL_DESTINATION", status: { not: "ARCHIVED" }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { draftPayload: true, publishedPayload: true },
  });
  if (siblings.some((row) => cmsHotelCanonicalId(row.draftPayload) === canonicalId || cmsHotelCanonicalId(row.publishedPayload) === canonicalId)) {
    throw new CmsContentError("CONFLICT", "This canonical hotel destination is already managed by another record. Open that record instead of adding a duplicate.");
  }
}

/** Hide/archive would otherwise silently remove linked public homepage cards. */
async function assertHotelNotUsedByPublishedHomepage(tx: Prisma.TransactionClient, payload: unknown) {
  const canonicalId = cmsHotelCanonicalId(payload);
  if (!canonicalId) return;
  const homepageRows = await tx.cmsContentItem.findMany({
    where: { type: "HOMEPAGE_DESTINATION", status: "PUBLISHED", publishedPayload: { not: Prisma.DbNull } },
    select: { publishedPayload: true },
  });
  const used = homepageRows.some((row) => homepageDestinationHotelCanonicalId(row.publishedPayload) === canonicalId);
  if (used) {
    throw new CmsContentError(
      "CONFLICT",
      "This hotel destination is used by published Homepage Destinations. Hide or replace those homepage cards first; hiding it now would remove them from the public homepage.",
    );
  }
}

/** Prevent new homepage publications from linking to an already hidden hotel. */
async function assertPublishedHomepageHasHotel(tx: Prisma.TransactionClient, payload: unknown) {
  const canonicalId = homepageDestinationHotelCanonicalId(payload);
  if (!canonicalId) return;
  const scope = await tx.cmsContentScope.findUnique({
    where: { type_market_locale: { type: "HOTEL_DESTINATION", market: "GLOBAL", locale: "en" } },
    select: { id: true },
  });
  // Before hotel CMS initialization the public API still uses the owned fallback list.
  if (!scope) return;
  const hotels = await tx.cmsContentItem.findMany({
    where: {
      type: "HOTEL_DESTINATION",
      status: "PUBLISHED",
      publishedMarket: "GLOBAL",
      publishedLocale: "en",
      publishedPayload: { not: Prisma.DbNull },
    },
    select: { publishedPayload: true },
  });
  if (!hotels.some((hotel) => cmsHotelCanonicalId(hotel.publishedPayload) === canonicalId)) {
    throw new CmsContentError(
      "CONFLICT",
      "The matching canonical Hotel Destination must be published before this Homepage Destination can go live.",
    );
  }
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
  // Market-targeted homepage records must never inherit the generic GLOBAL
  // fallback when an admin opens the All markets view and has not chosen one.
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const input = raw as Record<string, unknown>;
    if ((input.type === "HOMEPAGE_DESTINATION" || input.type === "FLIGHT_ROUTE") &&
        (typeof input.market !== "string" || !cmsMarketCodeSet.has(input.market.trim().toUpperCase()))) {
      throw new CmsContentError("INVALID", "Choose a supported market before creating this content.", { field: "market" });
    }
  }
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

      if (parsed.data.type === "HOTEL_DESTINATION") await assertUniqueHotelCanonicalId(tx, payload);
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
    assertHotelIdentityNotChanged(existing, payload);
    if (existing.type === "HOTEL_DESTINATION") await assertUniqueHotelCanonicalId(tx, payload, id);
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
      assertHotelIdentityNotChanged(existing, restoredPayload);
      if (existing.type === "HOTEL_DESTINATION") await assertUniqueHotelCanonicalId(tx, restoredPayload, id);
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
    if (transition === "PUBLISHED" && existing.type === "HOTEL_DESTINATION") {
      assertHotelIdentityNotChanged(existing, existing.draftPayload);
      await assertUniqueHotelCanonicalId(tx, existing.draftPayload, id);
    }
    if (transition === "PUBLISHED" && existing.type === "HOMEPAGE_DESTINATION") {
      await assertPublishedHomepageHasHotel(tx, existing.draftPayload);
    }
    if (transition !== "PUBLISHED" && existing.type === "HOTEL_DESTINATION" && existing.status === "PUBLISHED") {
      await assertHotelNotUsedByPublishedHomepage(tx, existing.publishedPayload);
    }
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
  search?: string;
  category?: string;
} = {}, reader?: Prisma.TransactionClient) {
  // An optional transaction client lets a full-directory read use one stable
  // database snapshot across every continuation page.
  const db = reader ?? getOptionalPrisma();
  if (!db) throw new CmsContentError("UNAVAILABLE", "CMS storage is unavailable.");

  const cursor = decodeCmsListCursor(input.cursor);
  const parsedMarket = input.market ? marketSchema.safeParse(input.market) : null;
  if (parsedMarket && !parsedMarket.success) throw new CmsContentError("INVALID", "Market filter is invalid.", parsedMarket.error.flatten());
  const parsedLocale = input.locale ? localeSchema.safeParse(input.locale) : null;
  if (parsedLocale && !parsedLocale.success) throw new CmsContentError("INVALID", "Locale filter is invalid.", parsedLocale.error.flatten());
  const search = input.search?.trim() || null;
  if (search && (search.length > 160 || /[\x00-\x1f\x7f]/.test(search))) {
    throw new CmsContentError("INVALID", "Search term must be 160 characters or fewer.", { field: "q" });
  }
  const category = input.category?.trim() || null;
  if (category && (category.length > 80 || /[\x00-\x1f\x7f]/.test(category))) {
    throw new CmsContentError("INVALID", "Category filter must be 80 characters or fewer.", { field: "category" });
  }
  const limit = input.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new CmsContentError("INVALID", "Limit must be an integer from 1 to 100.", { field: "limit" });
  }

  const scope: CmsListScope = {
    type: input.type ?? cursor?.scope.type ?? null,
    status: input.status ?? cursor?.scope.status ?? null,
    market: parsedMarket?.success ? parsedMarket.data : cursor?.scope.market ?? null,
    locale: parsedLocale?.success ? parsedLocale.data : cursor?.scope.locale ?? null,
    search: input.search !== undefined ? search : cursor?.scope.search ?? null,
    category: input.category !== undefined ? category : cursor?.scope.category ?? null,
  };
  if (cursor && JSON.stringify(cursor.scope) !== JSON.stringify(scope)) {
    throw new CmsContentError("INVALID", "CMS cursor does not match this query.", { field: "cursor" });
  }


  // Search runs in the database, not over just the first 100 items on screen.
  // Every interpolated value is bound through Prisma.sql, including the LIKE pattern.
  // Scope and continuation cursor are still enforced before any rows are returned.
  const searchTerm = scope.search;
  const rows = searchTerm
    ? await (async () => {
        const pattern = "%" + searchTerm.replace(/[\\%_]/g, (character) => "\\" + character) + "%";
        const predicates: Prisma.Sql[] = [Prisma.sql`TRUE`];
        if (scope.type) predicates.push(Prisma.sql`"type"::text = ${scope.type}`);
        if (scope.status) predicates.push(Prisma.sql`"status"::text = ${scope.status}`);
        if (scope.market) predicates.push(Prisma.sql`"market" = ${scope.market}`);
        if (scope.locale) predicates.push(Prisma.sql`"locale" = ${scope.locale}`);
        if (scope.category) predicates.push(Prisma.sql`"draftPayload"->>'category' = ${scope.category}`);
        if (cursor) {
          const updatedAt = new Date(cursor.updatedAt);
          predicates.push(Prisma.sql`("updatedAt" < ${updatedAt} OR ("updatedAt" = ${updatedAt} AND "id" < ${cursor.id}))`);
        }
        predicates.push(Prisma.sql`(
          "key" ILIKE ${pattern}
          OR EXISTS (
            SELECT 1 FROM jsonb_each_text(
              CASE WHEN jsonb_typeof("draftPayload") = 'object' THEN "draftPayload" ELSE '{}'::jsonb END
            ) AS field(key, value)
            WHERE field.value ILIKE ${pattern}
          )
        )`);
        const matches = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT "id" FROM "CmsContentItem"
          WHERE ${Prisma.join(predicates, " AND ")}
          ORDER BY "updatedAt" DESC, "id" DESC
          LIMIT ${limit + 1}
        `);
        if (matches.length === 0) return [];
        const matchedRows = await db.cmsContentItem.findMany({ where: { id: { in: matches.map((entry) => entry.id) } } });
        const byId = new Map(matchedRows.map((item) => [item.id, item]));
        return matches.flatMap((entry) => {
          const item = byId.get(entry.id);
          return item ? [item] : [];
        });
      })()
    : await db.cmsContentItem.findMany({
        where: {
          ...(scope.type ? { type: scope.type } : {}),
          ...(scope.status ? { status: scope.status } : {}),
          ...(scope.market ? { market: scope.market } : {}),
          ...(scope.locale ? { locale: scope.locale } : {}),
          ...(scope.category ? { draftPayload: { path: ["category"], equals: scope.category } } : {}),
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

/**
 * Fetch a full CMS directory consistently, including all matching search
 * results. A repeatable-read snapshot prevents records from disappearing if
 * another admin updates their updatedAt between cursor pages.
 *
 * The regular paginated reader remains unchanged for other admin screens.
 */
export async function listAdminCmsContentDirectory(input: {
  type: CmsContentType;
  status?: CmsContentStatus;
  market?: string;
  locale?: string;
  search?: string;
  category?: string;
}) {
  const db = getOptionalPrisma();
  if (!db) throw new CmsContentError("UNAVAILABLE", "CMS storage is unavailable.");

  return db.$transaction(async (tx) => {
    const pageInput = { ...input, limit: 100 };
    const firstPage = await listAdminCmsContent(pageInput, tx);
    const items = [...firstPage.items];
    let nextCursor = firstPage.nextCursor;

    while (nextCursor) {
      const nextPage = await listAdminCmsContent({ ...pageInput, cursor: nextCursor }, tx);
      items.push(...nextPage.items);
      nextCursor = nextPage.nextCursor;
    }

    return { items, nextCursor: null };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    timeout: 30_000,
  });
}

/** Canonical choices include a link to the record that already owns an identity. */
export async function getAdminCmsHotelOptions() {
  const db = getOptionalPrisma();
  if (!db) throw new CmsContentError("UNAVAILABLE", "CMS storage is unavailable.");
  const managed = await db.cmsContentItem.findMany({
    where: { type: "HOTEL_DESTINATION", status: { not: "ARCHIVED" } },
    select: { id: true, draftPayload: true, publishedPayload: true },
    orderBy: { id: "asc" },
  });
  const owners = new Map<string, string>();
  for (const row of managed) {
    for (const payload of [row.draftPayload, row.publishedPayload]) {
      const canonicalId = cmsHotelCanonicalId(payload);
      if (canonicalId && !owners.has(canonicalId)) owners.set(canonicalId, row.id);
    }
  }
  return hotelDestinations.map((destination) => ({
    canonicalId: `hotel:${destination.id}`,
    label: `${destination.name} · ${destination.country}`,
    name: destination.name, country: destination.country, countryCode: destination.countryCode,
    kind: destination.kind, searchValue: destination.searchValue,
    managedItemId: owners.get(`hotel:${destination.id}`),
  }));
}

/** Sort the entire filtered directory before paging, never only the current page. */
export async function listAdminCmsFaqPage(input: {
  status?: CmsContentStatus; search?: string; category?: string; cursor?: string;
}) {
  const scope = { status: input.status ?? null, search: input.search?.trim() || null, category: input.category?.trim() || null };
  let after: { sortOrder: number; key: string; id: string } | null = null;
  if (input.cursor) {
    try {
      if (input.cursor.length > 2048) throw new Error("invalid");
      const decoded = JSON.parse(Buffer.from(input.cursor, "base64url").toString("utf8"));
      if (decoded.v !== 1 || decoded.kind !== "faq-order" || JSON.stringify(decoded.scope) !== JSON.stringify(scope)
        || !Number.isInteger(decoded.after?.sortOrder) || typeof decoded.after?.key !== "string"
        || typeof decoded.after?.id !== "string" || !cmsCursorId.test(decoded.after.id)) throw new Error("invalid");
      after = decoded.after;
    } catch { throw new CmsContentError("INVALID", "FAQ cursor does not match this query. Return to the first page.", { field: "cursor" }); }
  }
  const directory = await listAdminCmsContentDirectory({
    type: "FAQ", market: "GLOBAL", locale: "en", status: input.status,
    search: input.search, category: input.category,
  });
  const sorted = sortCmsFaqDirectory(directory.items);
  const remaining = after ? sorted.filter((item) => item.sortOrder > after!.sortOrder ||
    (item.sortOrder === after!.sortOrder && (item.key.localeCompare(after!.key) > 0 ||
      (item.key === after!.key && item.id.localeCompare(after!.id) > 0)))) : sorted;
  const items = remaining.slice(0, 100);
  const last = items.at(-1);
  return { items, nextCursor: remaining.length > 100 && last ? Buffer.from(JSON.stringify({
    v: 1, kind: "faq-order", scope, after: { sortOrder: last.sortOrder, key: last.key, id: last.id },
  }), "utf8").toString("base64url") : null };
}

/** Options reflect all CMS draft records, not only one paginated list page. */
export async function listAdminCmsFaqCategories(): Promise<string[]> {
  const db = getOptionalPrisma();
  if (!db) return [];
  const rows = await db.$queryRaw<Array<{ category: string }>>(Prisma.sql`
    SELECT DISTINCT "draftPayload"->>'category' AS category
    FROM "CmsContentItem"
    WHERE "type" = 'FAQ'::"CmsContentType"
      AND "market" = 'GLOBAL'
      AND "locale" = 'en'
      AND jsonb_typeof("draftPayload") = 'object'
      AND "draftPayload"->>'category' IS NOT NULL
    ORDER BY category
  `);
  return rows.map(row => row.category).filter(Boolean);
}

export async function getAdminCmsContent(id: string, beforeVersion?: string) {
  if (beforeVersion !== undefined && (!/^[1-9]\d*$/.test(beforeVersion) || !Number.isSafeInteger(Number(beforeVersion)))) {
    throw new CmsContentError("INVALID", "Revision cursor is invalid.", { field: "revisionBefore" });
  }
  const db = getOptionalPrisma();
  if (!db) throw new CmsContentError("UNAVAILABLE", "CMS storage is unavailable.");
  const item = await db.cmsContentItem.findUnique({
    where: { id },
    include: { revisions: {
      ...(beforeVersion ? { where: { version: { lt: Number(beforeVersion) } } } : {}),
      orderBy: { version: "desc" }, take: 51,
    } },
  });
  if (!item) throw new CmsContentError("NOT_FOUND", "Content item not found.");
  return {
    item: serialize(item),
    nextRevisionBefore: item.revisions.length > 50 ? String(item.revisions[49].version) : null,
    revisions: item.revisions.slice(0, 50).map((revision) => ({
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
      const integrity = validateCmsPayloadIntegrity(type, row.publishedPayload);
      const parsed = cmsPayloadSchemas[type].safeParse(row.publishedPayload);
      if (!integrity.valid || !parsed.success) {
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



/**
 * Landing-page aggregate for a CMS type across its supported content markets.
 * Count the published snapshot's market/locale, never the editable draft scope.
 * Each item is counted once, even if the market list contains duplicates.
 */
export async function getCmsContentMarketOverview(
  type: CmsContentType,
  markets: readonly string[],
  locale: string,
) {
  const db = getOptionalPrisma();
  if (!db) return { available: false, active: false, needsSetup: false, publishedInScope: 0 };

  const normalizedMarkets = [...new Set(markets)];
  const parsedLocale = localeSchema.safeParse(locale);
  if (
    !parsedLocale.success ||
    normalizedMarkets.length === 0 ||
    normalizedMarkets.some((market) => !marketSchema.safeParse(market).success)
  ) {
    throw new CmsContentError("INVALID", "CMS overview markets or locale are invalid.");
  }

  const [scopeCount, publishedInScope] = await Promise.all([
    db.cmsContentScope.count({
      where: { type, market: { in: normalizedMarkets }, locale: parsedLocale.data },
    }),
    db.cmsContentItem.count({
      where: {
        type,
        status: "PUBLISHED",
        publishedMarket: { in: normalizedMarkets },
        publishedLocale: parsedLocale.data,
        publishedPayload: { not: Prisma.DbNull },
      },
    }),
  ]);

  return {
    available: true,
    active: scopeCount > 0,
    needsSetup: scopeCount < normalizedMarkets.length,
    publishedInScope,
  };
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
      publishedInScope: 0,
      hidden: 0,
      archived: 0,
    };
  }
  const parsedMarket = marketSchema.safeParse(market);
  const parsedLocale = localeSchema.safeParse(locale);
  if (!parsedMarket.success || !parsedLocale.success) {
    throw new CmsContentError("INVALID", "CMS scope is invalid.");
  }
  const [scope, groups, publishedInScope] = await Promise.all([
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
    // A saved draft may move scope without moving its published version.
    // This count mirrors the public reader's published market/locale predicate.
    db.cmsContentItem.count({
      where: {
        type,
        status: "PUBLISHED",
        publishedMarket: parsedMarket.data,
        publishedLocale: parsedLocale.data,
        publishedPayload: { not: Prisma.DbNull },
      },
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
    publishedInScope,
    hidden: counts.get("HIDDEN") ?? 0,
    archived: counts.get("ARCHIVED") ?? 0,
  };
}
