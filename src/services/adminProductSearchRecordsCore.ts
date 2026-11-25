import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { PublicEnvironment } from "@/lib/stagingSafety";
import { resolveAdminTimeZone, viewerTodayStart } from "@/lib/adminLocalTime";
import { classifyProviderIssue, providerSearchService } from "@/services/searchFailureDiagnostics";

export type ProviderProduct = "HOTEL" | "CAR";
export type ProductSearchFilter = "ALL" | "EXCEPTIONS" | "SUCCESS" | "PARTIAL" | "FAILED" | "ZERO_RESULTS";
export type ProductSearchWindow = "today" | "24h" | "7d" | "30d" | "all";

export type ProductSearchRecord = {
  id: string;
  requestId: string | null;
  product: ProviderProduct;
  origin: string | null;
  destination: string | null;
  checkIn: string | null;
  checkOut: string | null;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  outcome: "SUCCESS" | "PARTIAL" | "FAILED" | "ZERO_RESULTS";
  resultCount: number;
  latencyMs: number | null;
  createdAt: string;
};
export type ProductSearchProviderObservation = {
  id: string;
  provider: string;
  status: "SUCCESS" | "DEGRADED" | "FAILED" | "DISABLED";
  category: string | null;
  latencyMs: number | null;
  observedAt: string;
};
export type ProductSearchPage = {
  items: ProductSearchRecord[];
  nextCursor: string | null;
  product: ProviderProduct;
  filter: ProductSearchFilter;
  window: ProductSearchWindow;
  timeZone: string;
};
export type ProductSearchDetails = {
  search: ProductSearchRecord;
  providers: ProductSearchProviderObservation[];
  providerEvidence: "exact" | "unavailable";
};
export type ProductSearchResult<T> =
  | { status: "ok"; data: T }
  | { status: "invalid"; issues: Array<{ field: string; message: string }> }
  | { status: "forbidden" | "not_found" | "unavailable" };

type Database = Pick<PrismaClient, "searchHistory" | "apiProviderLog">;
type Dependencies = {
  authorize: () => Promise<boolean>;
  database: () => Database | null;
  environment: () => PublicEnvironment;
  now: () => Date;
  timeZone?: () => Promise<string>;
};

const LIMIT = 25;
const ID = /^[A-Za-z0-9_-]{6,128}$/;
const filters: readonly ProductSearchFilter[] = ["ALL", "EXCEPTIONS", "SUCCESS", "PARTIAL", "FAILED", "ZERO_RESULTS"];
const windows: readonly ProductSearchWindow[] = ["today", "24h", "7d", "30d", "all"];
const searchSelect = {
  id: true, requestId: true, type: true, origin: true, destination: true,
  checkIn: true, checkOut: true, status: true, resultCount: true,
  latencyMs: true, createdAt: true,
} satisfies Prisma.SearchHistorySelect;
type SearchRow = Prisma.SearchHistoryGetPayload<{ select: typeof searchSelect }>;

const providerSelect = {
  id: true, provider: true, status: true, errorMessage: true,
  latencyMs: true, createdAt: true,
} satisfies Prisma.ApiProviderLogSelect;

type SearchCursor = {
  v: number;
  product: ProviderProduct;
  filter: ProductSearchFilter;
  window: ProductSearchWindow;
  environment: PublicEnvironment;
  timeZone: string;
  asOf: string;
  at: string;
  id: string;
};

function invalid(field: string, message: string): ProductSearchResult<never> {
  return { status: "invalid", issues: [{ field, message }] };
}

function isIso(value: unknown): value is string {
  return typeof value === "string"
    && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function clean(value: string | null, max: number) {
  return value?.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) || null;
}

function productValue(params: URLSearchParams): ProviderProduct | null {
  const product = params.get("product");
  return product === "HOTEL" || product === "CAR" ? product : null;
}

function cursorToken(cursor: SearchCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function parseCursor(value: string | null, expected: Pick<SearchCursor, "product" | "filter" | "window" | "environment" | "timeZone">, now: Date):
  | { ok: true; cursor: SearchCursor | null }
  | { ok: false } {
  if (!value) return { ok: true, cursor: null };
  if (value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) return { ok: false };
  try {
    const data = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    if (data.v !== 1 || data.product !== expected.product || data.filter !== expected.filter
      || data.window !== expected.window || data.environment !== expected.environment
      || (data.timeZone ?? "UTC") !== expected.timeZone
      || !isIso(data.asOf) || !isIso(data.at) || typeof data.id !== "string" || !ID.test(data.id)
      || Date.parse(data.at) > Date.parse(data.asOf)
      || Date.parse(data.asOf) > now.getTime() + 60_000) return { ok: false };
    return { ok: true, cursor: {
      v: 1,
      product: expected.product,
      filter: expected.filter,
      window: expected.window,
      environment: expected.environment,
      timeZone: expected.timeZone,
      asOf: data.asOf,
      at: data.at,
      id: data.id,
    } };
  } catch {
    return { ok: false };
  }
}

function toRecord(row: SearchRow): ProductSearchRecord {
  return {
    id: row.id,
    requestId: clean(row.requestId, 128),
    product: row.type as ProviderProduct,
    origin: clean(row.origin, 200),
    destination: clean(row.destination, 200),
    checkIn: row.checkIn?.toISOString() ?? null,
    checkOut: row.checkOut?.toISOString() ?? null,
    status: row.status,
    outcome: row.status === "SUCCESS" && row.resultCount === 0 ? "ZERO_RESULTS" : row.status,
    resultCount: row.resultCount,
    latencyMs: row.latencyMs,
    createdAt: row.createdAt.toISOString(),
  };
}

function scopeWhere(product: ProviderProduct, filter: ProductSearchFilter, window: ProductSearchWindow, environment: PublicEnvironment, timeZone: string, asOf: Date, cursor: SearchCursor | null): Prisma.SearchHistoryWhereInput {
  const and: Prisma.SearchHistoryWhereInput[] = [];
  if (filter === "EXCEPTIONS") {
    and.push({ OR: [{ status: { in: ["FAILED", "PARTIAL"] } }, { status: "SUCCESS", resultCount: 0 }] });
  }
  if (cursor) {
    and.push({ OR: [
      { createdAt: { lt: new Date(cursor.at) } },
      { createdAt: new Date(cursor.at), id: { lt: cursor.id } },
    ] });
  }
  const hours = window === "24h" ? 24 : window === "7d" ? 24 * 7 : window === "30d" ? 24 * 30 : null;
  return {
    type: product,
    countAsSearch: true,
    query: { path: ["environment"], equals: environment },
    createdAt: {
      lte: asOf,
      ...(window === "today" ? { gte: new Date(viewerTodayStart(asOf, timeZone)) }
          : hours ? { gte: new Date(asOf.getTime() - hours * 60 * 60_000) } : {}),
    },
    ...(filter === "SUCCESS" || filter === "PARTIAL" || filter === "FAILED" ? { status: filter } : {}),
    ...(filter === "ZERO_RESULTS" ? { status: "SUCCESS" as const, resultCount: 0 } : {}),
    ...(and.length ? { AND: and } : {}),
  };
}

/** Independent authorization is required for both reads, not merely page access.
 * Product and deployment environment are applied in the database query itself.
 * No customer identity, request JSON, raw provider error or URLs are returned. */
export function createAdminProductSearchRecordsReader(deps: Dependencies) {
  return {
    async list(params: URLSearchParams): Promise<ProductSearchResult<ProductSearchPage>> {
      try {
        if (!(await deps.authorize())) return { status: "forbidden" };
        for (const key of params.keys()) {
          if (!["product", "filter", "window", "cursor"].includes(key)) return invalid(key, "Unknown parameter.");
        }
        for (const key of ["product", "filter", "window", "cursor"]) {
          if (params.getAll(key).length > 1) return invalid(key, "Repeated parameter.");
        }
        const product = productValue(params);
        if (!product) return invalid("product", "Specify HOTEL or CAR.");
        const filter = params.get("filter") || "ALL";
        const window = params.get("window") || "today";
        if (!filters.includes(filter as ProductSearchFilter)) return invalid("filter", "Invalid record filter.");
        if (!windows.includes(window as ProductSearchWindow)) return invalid("window", "Invalid reporting window.");
        const typedFilter = filter as ProductSearchFilter;
        const typedWindow = window as ProductSearchWindow;
        const environment = deps.environment();
        const timeZone = resolveAdminTimeZone(await deps.timeZone?.());
        const now = deps.now();
        const continuation = parseCursor(params.get("cursor"), { product, filter: typedFilter, window: typedWindow, environment, timeZone }, now);
        if (!continuation.ok) return invalid("cursor", "Cursor does not match this product and filter.");
        const db = deps.database();
        if (!db) return { status: "unavailable" };
        const cursor = continuation.cursor;
        const asOf = cursor ? new Date(cursor.asOf) : now;
        const records = await db.searchHistory.findMany({
          where: scopeWhere(product, typedFilter, typedWindow, environment, timeZone, asOf, cursor),
          select: searchSelect,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: LIMIT + 1,
        });
        const page = records.slice(0, LIMIT);
        const last = page[page.length - 1];
        const nextCursor = records.length > LIMIT && last
          ? cursorToken({ v: 1, product, filter: typedFilter, window: typedWindow, environment, timeZone,
              asOf: asOf.toISOString(), at: last.createdAt.toISOString(), id: last.id })
          : null;
        return { status: "ok", data: { product, filter: typedFilter, window: typedWindow, timeZone, items: page.map(toRecord), nextCursor } };
      } catch {
        return { status: "unavailable" };
      }
    },

    async detail(id: string, params: URLSearchParams): Promise<ProductSearchResult<ProductSearchDetails>> {
      try {
        if (!(await deps.authorize())) return { status: "forbidden" };
        if (!ID.test(id)) return invalid("id", "Invalid search ID.");
        for (const key of params.keys()) if (key !== "product") return invalid(key, "Unknown parameter.");
        if (params.getAll("product").length !== 1) return invalid("product", "Specify one product.");
        const product = productValue(params);
        if (!product) return invalid("product", "Specify HOTEL or CAR.");
        const environment = deps.environment();
        const db = deps.database();
        if (!db) return { status: "unavailable" };
        const search = await db.searchHistory.findFirst({
          where: { id, type: product, query: { path: ["environment"], equals: environment } },
          select: searchSelect,
        });
        if (!search) return { status: "not_found" };
        const providerLogs = search.requestId
          ? await db.apiProviderLog.findMany({
              where: {
                service: providerSearchService(product),
                AND: [
                  { metadata: { path: ["requestId"], equals: search.requestId } },
                  { metadata: { path: ["environment"], equals: environment } },
                ],
              },
              select: providerSelect,
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              take: 20,
            })
          : [];
        return { status: "ok", data: {
          search: toRecord(search),
          providerEvidence: providerLogs.length ? "exact" : "unavailable",
          providers: providerLogs.map(log => ({
            id: log.id,
            provider: clean(log.provider, 100) || "Unknown provider",
            status: log.status,
            category: log.status === "SUCCESS" ? null : classifyProviderIssue(log.errorMessage).label,
            latencyMs: log.latencyMs,
            observedAt: log.createdAt.toISOString(),
          })),
        } };
      } catch {
        return { status: "unavailable" };
      }
    },
  };
}
