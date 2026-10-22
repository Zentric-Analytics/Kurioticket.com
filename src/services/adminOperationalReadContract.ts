import type { PublicEnvironment } from "@/lib/stagingSafety";

export type AdminOperationalKind = "searches" | "handoffs" | "support" | "deletions";
export type AdminIdentityFilter = "all" | "guest" | "registered" | "unattributed";
export type AdminSearchProduct = "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE";
export type AdminSearchStatus = "SUCCESS" | "PARTIAL" | "FAILED";
export type AdminSupportStatus = "OPEN" | "WAITING_ON_USER" | "WAITING_ON_TEAM" | "RESOLVED" | "CLOSED";
export type AdminSupportPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type AdminDeletionStatus = "PENDING" | "CANCELLED" | "READY_FOR_REVIEW" | "COMPLETED";
export type AdminHandoffCorrelation = "exact" | "unavailable";

export type AdminOperationalIssue = { field: string; message: string };
export type AdminOperationalResult<T> =
  | { status: "ok"; data: T }
  | { status: "invalid"; issues: AdminOperationalIssue[] }
  | { status: "forbidden" }
  | { status: "not_found" }
  | { status: "unavailable" };

type CursorPosition = { at: string; id: string };
type ScopeBase = {
  from: string | null;
  to: string | null;
};

export type AdminSearchScope = ScopeBase & {
  environment: PublicEnvironment;
  product: AdminSearchProduct | null;
  status: AdminSearchStatus | null;
  identity: AdminIdentityFilter;
  userId: string | null;
  visitorId: string | null;
  provider: string | null;
};
export type AdminHandoffScope = ScopeBase & {
  environment: PublicEnvironment;
  product: "FLIGHT" | "HOTEL" | null;
  identity: AdminIdentityFilter;
  userId: string | null;
  visitorId: string | null;
  provider: string | null;
  correlation: AdminHandoffCorrelation | null;
};
export type AdminSupportScope = ScopeBase & {
  status: AdminSupportStatus | null;
  priority: AdminSupportPriority | null;
  category: string | null;
  q: string | null;
};
export type AdminDeletionScope = ScopeBase & {
  status: AdminDeletionStatus | null;
  q: string | null;
};

export type AdminSearchQuery = { scope: AdminSearchScope; limit: number; cursor: CursorPosition | null };
export type AdminHandoffQuery = { scope: AdminHandoffScope; limit: number; cursor: CursorPosition | null };
export type AdminSupportQuery = { scope: AdminSupportScope; limit: number; cursor: CursorPosition | null };
export type AdminDeletionQuery = { scope: AdminDeletionScope; limit: number; cursor: CursorPosition | null };

export type AdminOperationalIdentity = {
  kind: "registered" | "guest" | "unattributed";
  userId: string | null;
  visitorId: string | null;
};

export type AdminSearchRead = {
  id: string;
  requestId: string | null;
  identity: AdminOperationalIdentity;
  product: AdminSearchProduct;
  origin: string | null;
  destination: string | null;
  checkIn: string | null;
  checkOut: string | null;
  resultCount: number;
  latencyMs: number | null;
  status: AdminSearchStatus;
  providers: string[];
  market: string | null;
  currency: string | null;
  environment: PublicEnvironment;
  createdAt: string;
};

export type AdminHandoffRead = {
  id: string;
  identity: AdminOperationalIdentity;
  product: "FLIGHT" | "HOTEL";
  provider: string;
  route: string | null;
  price: string | null;
  currency: string;
  sourcePage: string | null;
  destinationDomain: string | null;
  environment: PublicEnvironment;
  searchCorrelation: {
    kind: AdminHandoffCorrelation;
    searchHistoryId: string | null;
  };
  createdAt: string;
};

export type AdminSupportListItem = {
  id: string;
  identity: { kind: "registered" | "guest"; userId: string | null };
  email: string;
  subject: string;
  category: string;
  status: AdminSupportStatus;
  priority: AdminSupportPriority;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminSupportDetail = AdminSupportListItem & {
  user: { id: string; email: string | null; name: string | null } | null;
  source: { page?: string; platform?: string; source?: string; action?: string };
  messages: Array<{ id: string; author: string; body: string; createdAt: string }>;
  deletionRequestId: string | null;
};

export type AdminDeletionListItem = {
  id: string;
  userId: string;
  email: string;
  user: { email: string | null; name: string | null; role: string; status: string };
  status: AdminDeletionStatus;
  requestedAt: string;
  deletionScheduledAt: string;
  cancelledAt: string | null;
  completedAt: string | null;
  supportTicketId: string | null;
  adminReference: string | null;
  hasReviewNotes: boolean;
};

export type AdminOperationalList<T, S> = {
  scope: S;
  items: T[];
  nextCursor: string | null;
};

type ParseResult<T> = { status: "ok"; data: T } | { status: "invalid"; issues: AdminOperationalIssue[] };

const COMMON = ["from", "to", "limit", "cursor"] as const;
const SEARCH_KEYS = [...COMMON, "environment", "product", "status", "identity", "userId", "visitorId", "provider"] as const;
const HANDOFF_KEYS = [...COMMON, "environment", "product", "identity", "userId", "visitorId", "provider", "correlation"] as const;
const SUPPORT_KEYS = [...COMMON, "status", "priority", "category", "q"] as const;
const DELETION_KEYS = [...COMMON, "status", "q"] as const;
const DETAIL_KEYS = ["environment"] as const;
const ID = /^[A-Za-z0-9_-]{6,128}$/;
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

function invalid(field: string, message: string): ParseResult<never> {
  return { status: "invalid", issues: [{ field, message }] };
}

function values(params: URLSearchParams, allowed: readonly string[]): ParseResult<Record<string, string | null>> {
  for (const key of params.keys()) if (!allowed.includes(key)) return invalid(key, "Unknown query parameter.");
  const result: Record<string, string | null> = {};
  for (const key of allowed) {
    const all = params.getAll(key);
    if (all.length > 1) return invalid(key, "Repeated query parameters are not allowed.");
    result[key] = all[0] ?? null;
  }
  return { status: "ok" as const, data: result };
}

function optionalDate(value: string | null, field: string): ParseResult<string | null> {
  if (!value) return { status: "ok" as const, data: null as string | null };
  if (!ISO_WITH_ZONE.test(value) || !Number.isFinite(Date.parse(value))) return invalid(field, "Use an ISO timestamp with an explicit timezone.");
  return { status: "ok" as const, data: new Date(value).toISOString() };
}

function optionalText(value: string | null, field: string, max: number): ParseResult<string | null> {
  if (value === null) return { status: "ok" as const, data: null as string | null };
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max || /[\u0000-\u001f\u007f]/.test(trimmed)) return invalid(field, `Use 1-${max} printable characters.`);
  return { status: "ok" as const, data: trimmed };
}

function optionalId(value: string | null, field: string): ParseResult<string | null> {
  if (value === null) return { status: "ok" as const, data: null as string | null };
  return ID.test(value) ? { status: "ok" as const, data: value } : invalid(field, "Invalid identifier.");
}

function enumValue<T extends string>(value: string | null, field: string, allowed: readonly T[]): ParseResult<T | null> {
  if (value === null) return { status: "ok" as const, data: null as T | null };
  return allowed.includes(value as T) ? { status: "ok" as const, data: value as T } : invalid(field, "Invalid value.");
}

function limit(value: string | null): ParseResult<number> {
  if (value === null) return { status: "ok" as const, data: 50 };
  if (!/^\d+$/.test(value)) return invalid("limit", "Limit must be an integer from 1 to 100.");
  const parsed = Number(value);
  return parsed >= 1 && parsed <= 100 ? { status: "ok" as const, data: parsed } : invalid("limit", "Limit must be an integer from 1 to 100.");
}

function baseScope(raw: Record<string, string | null>): ParseResult<ScopeBase> {
  const from = optionalDate(raw.from, "from");
  if (from.status !== "ok") return from;
  const to = optionalDate(raw.to, "to");
  if (to.status !== "ok") return to;
  if (from.data && to.data && Date.parse(from.data) >= Date.parse(to.data)) return invalid("from", "from must be earlier than to.");
  return { status: "ok" as const, data: { from: from.data, to: to.data } };
}

function scopeKey(scope: object) {
  return JSON.stringify(scope);
}

function decodeCursor(kind: AdminOperationalKind, token: string | null, scope: object): ParseResult<CursorPosition | null> {
  if (!token) return { status: "ok", data: null };
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as Record<string, unknown>;
    if (decoded.v !== 1 || decoded.kind !== kind || typeof decoded.at !== "string" || typeof decoded.id !== "string" || decoded.scope !== scopeKey(scope)) {
      return invalid("cursor", "Cursor does not match this query.");
    }
    if (!ISO_WITH_ZONE.test(decoded.at) || !Number.isFinite(Date.parse(decoded.at)) || !ID.test(decoded.id)) return invalid("cursor", "Cursor is malformed.");
    return { status: "ok", data: { at: new Date(decoded.at).toISOString(), id: decoded.id } };
  } catch {
    return invalid("cursor", "Cursor is malformed.");
  }
}

export function encodeAdminOperationalCursor(kind: AdminOperationalKind, scope: object, position: CursorPosition) {
  return Buffer.from(JSON.stringify({ v: 1, kind, at: position.at, id: position.id, scope: scopeKey(scope) }), "utf8").toString("base64url");
}

function environment(value: string | null, fallback: PublicEnvironment): ParseResult<PublicEnvironment> {
  if (value === null) return { status: "ok" as const, data: fallback };
  return value === "staging" || value === "production" ? { status: "ok" as const, data: value } : invalid("environment", "Invalid environment.");
}

function identity(value: string | null): ParseResult<AdminIdentityFilter> {
  if (value === null) return { status: "ok" as const, data: "all" as AdminIdentityFilter };
  return ["all", "guest", "registered", "unattributed"].includes(value)
    ? { status: "ok" as const, data: value as AdminIdentityFilter }
    : invalid("identity", "Invalid identity filter.");
}

function finish<T extends { scope: object }>(kind: AdminOperationalKind, raw: Record<string, string | null>, parsed: T): ParseResult<T & { limit: number; cursor: CursorPosition | null }> {
  const parsedLimit = limit(raw.limit);
  if (parsedLimit.status !== "ok") return parsedLimit;
  const cursor = decodeCursor(kind, raw.cursor, parsed.scope);
  if (cursor.status !== "ok") return cursor;
  return { status: "ok", data: { ...parsed, limit: parsedLimit.data, cursor: cursor.data } };
}

export function parseAdminSearchQuery(params: URLSearchParams, fallbackEnvironment: PublicEnvironment): ParseResult<AdminSearchQuery> {
  const raw = values(params, SEARCH_KEYS);
  if (raw.status !== "ok") return raw;
  const base = baseScope(raw.data);
  if (base.status !== "ok") return base;
  const env = environment(raw.data.environment, fallbackEnvironment);
  const product = enumValue(raw.data.product, "product", ["FLIGHT", "HOTEL", "CAR", "PACKAGE"] as const);
  const status = enumValue(raw.data.status, "status", ["SUCCESS", "PARTIAL", "FAILED"] as const);
  const idFilter = identity(raw.data.identity);
  const userId = optionalId(raw.data.userId, "userId");
  const visitorId = optionalId(raw.data.visitorId, "visitorId");
  const provider = optionalText(raw.data.provider, "provider", 100);
  if (env.status !== "ok") return env;
  if (product.status !== "ok") return product;
  if (status.status !== "ok") return status;
  if (idFilter.status !== "ok") return idFilter;
  if (userId.status !== "ok") return userId;
  if (visitorId.status !== "ok") return visitorId;
  if (provider.status !== "ok") return provider;
  if ((idFilter.data === "guest" || idFilter.data === "unattributed") && userId.data) return invalid("userId", "userId conflicts with this identity filter.");
  if (idFilter.data === "unattributed" && visitorId.data) return invalid("visitorId", "visitorId conflicts with this identity filter.");
  const scope: AdminSearchScope = { ...base.data, environment: env.data, product: product.data, status: status.data, identity: idFilter.data, userId: userId.data, visitorId: visitorId.data, provider: provider.data };
  return finish("searches", raw.data, { scope });
}

export function parseAdminHandoffQuery(params: URLSearchParams, fallbackEnvironment: PublicEnvironment): ParseResult<AdminHandoffQuery> {
  const raw = values(params, HANDOFF_KEYS);
  if (raw.status !== "ok") return raw;
  const base = baseScope(raw.data);
  if (base.status !== "ok") return base;
  const env = environment(raw.data.environment, fallbackEnvironment);
  const product = enumValue(raw.data.product, "product", ["FLIGHT", "HOTEL"] as const);
  const idFilter = identity(raw.data.identity);
  const userId = optionalId(raw.data.userId, "userId");
  const visitorId = optionalId(raw.data.visitorId, "visitorId");
  const provider = optionalText(raw.data.provider, "provider", 100);
  const correlation = enumValue(raw.data.correlation, "correlation", ["exact", "unavailable"] as const);
  if (env.status !== "ok") return env;
  if (product.status !== "ok") return product;
  if (idFilter.status !== "ok") return idFilter;
  if (userId.status !== "ok") return userId;
  if (visitorId.status !== "ok") return visitorId;
  if (provider.status !== "ok") return provider;
  if (correlation.status !== "ok") return correlation;
  if ((idFilter.data === "guest" || idFilter.data === "unattributed") && userId.data) return invalid("userId", "userId conflicts with this identity filter.");
  if (idFilter.data === "unattributed" && visitorId.data) return invalid("visitorId", "visitorId conflicts with this identity filter.");
  const scope: AdminHandoffScope = { ...base.data, environment: env.data, product: product.data, identity: idFilter.data, userId: userId.data, visitorId: visitorId.data, provider: provider.data, correlation: correlation.data };
  return finish("handoffs", raw.data, { scope });
}

export function parseAdminSupportQuery(params: URLSearchParams): ParseResult<AdminSupportQuery> {
  const raw = values(params, SUPPORT_KEYS);
  if (raw.status !== "ok") return raw;
  const base = baseScope(raw.data);
  if (base.status !== "ok") return base;
  const status = enumValue(raw.data.status, "status", ["OPEN", "WAITING_ON_USER", "WAITING_ON_TEAM", "RESOLVED", "CLOSED"] as const);
  const priority = enumValue(raw.data.priority, "priority", ["LOW", "NORMAL", "HIGH", "URGENT"] as const);
  const category = optionalText(raw.data.category, "category", 80);
  const q = optionalText(raw.data.q, "q", 160);
  if (status.status !== "ok") return status;
  if (priority.status !== "ok") return priority;
  if (category.status !== "ok") return category;
  if (q.status !== "ok") return q;
  const scope: AdminSupportScope = { ...base.data, status: status.data, priority: priority.data, category: category.data, q: q.data };
  return finish("support", raw.data, { scope });
}

export function parseAdminDeletionQuery(params: URLSearchParams): ParseResult<AdminDeletionQuery> {
  const raw = values(params, DELETION_KEYS);
  if (raw.status !== "ok") return raw;
  const base = baseScope(raw.data);
  if (base.status !== "ok") return base;
  const status = enumValue(raw.data.status, "status", ["PENDING", "CANCELLED", "READY_FOR_REVIEW", "COMPLETED"] as const);
  const q = optionalText(raw.data.q, "q", 160);
  if (status.status !== "ok") return status;
  if (q.status !== "ok") return q;
  const scope: AdminDeletionScope = { ...base.data, status: status.data, q: q.data };
  return finish("deletions", raw.data, { scope });
}

export function parseAdminOperationalId(value: string): ParseResult<string> {
  return ID.test(value) ? { status: "ok", data: value } : invalid("id", "Invalid identifier.");
}

export function parseAdminOperationalEnvironment(params: URLSearchParams, fallback: PublicEnvironment): ParseResult<PublicEnvironment> {
  const raw = values(params, DETAIL_KEYS);
  if (raw.status !== "ok") return raw;
  return environment(raw.data.environment, fallback);
}
