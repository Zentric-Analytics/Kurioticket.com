export type AdminAuditScope = {
  from: string;
  to: string;
  action: string | null;
  adminEmail: string | null;
  targetType: string | null;
  targetEmail: string | null;
};

export type AdminAuditRead = {
  id: string;
  adminUserId: string | null;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetEmail: string | null;
  createdAt: string;
};

export type AdminAuditList = {
  scope: AdminAuditScope;
  items: AdminAuditRead[];
  nextCursor: string | null;
};

export type AdminAuditIssue = { field: string; message: string };
export type AdminAuditResult<T> =
  | { status: "ok"; data: T }
  | { status: "invalid"; issues: AdminAuditIssue[] }
  | { status: "forbidden" }
  | { status: "unavailable" };

export type AdminAuditQuery = {
  scope: AdminAuditScope;
  limit: number;
  cursor: { at: string; id: string } | null;
};

type ParseResult<T> =
  | { status: "ok"; data: T }
  | { status: "invalid"; issues: AdminAuditIssue[] };

const allowedKeys = ["from", "to", "action", "adminEmail", "targetType", "targetEmail", "limit", "cursor"] as const;
const dayMs = 24 * 60 * 60 * 1000;
const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const id = /^[A-Za-z0-9_-]{6,128}$/;

function invalid(field: string, message: string): ParseResult<never> {
  return { status: "invalid", issues: [{ field, message }] };
}

function text(value: string | null, field: string, max: number): ParseResult<string | null> {
  if (value === null) return { status: "ok", data: null };
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max || /[\u0000-\u001f\u007f]/.test(trimmed)) {
    return invalid(field, `Use 1-${max} printable characters.`);
  }
  return { status: "ok", data: trimmed };
}

function timestamp(value: string | null, field: string): ParseResult<string | null> {
  if (value === null) return { status: "ok", data: null };
  if (!iso.test(value) || !Number.isFinite(Date.parse(value))) {
    return invalid(field, "Use an ISO timestamp with an explicit timezone.");
  }
  return { status: "ok", data: new Date(value).toISOString() };
}

function encodeCursor(scope: AdminAuditScope, at: string, cursorId: string) {
  return Buffer.from(JSON.stringify({ v: 1, scope, at, id: cursorId }), "utf8").toString("base64url");
}

function decodeCursor(value: string | null, scope: AdminAuditScope): ParseResult<{ at: string; id: string } | null> {
  if (!value) return { status: "ok", data: null };
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    if (
      decoded.v !== 1 ||
      JSON.stringify(decoded.scope) !== JSON.stringify(scope) ||
      typeof decoded.at !== "string" ||
      !iso.test(decoded.at) ||
      !Number.isFinite(Date.parse(decoded.at)) ||
      typeof decoded.id !== "string" ||
      !id.test(decoded.id)
    ) return invalid("cursor", "Cursor does not match this query.");
    return { status: "ok", data: { at: new Date(decoded.at).toISOString(), id: decoded.id } };
  } catch {
    return invalid("cursor", "Cursor is malformed.");
  }
}

export function encodeAdminAuditCursor(scope: AdminAuditScope, at: string, cursorId: string) {
  return encodeCursor(scope, at, cursorId);
}

export function parseAdminAuditQuery(params: URLSearchParams, now = new Date()): ParseResult<AdminAuditQuery> {
  for (const key of params.keys()) {
    if (!allowedKeys.includes(key as never)) return invalid(key, "Unknown query parameter.");
    if (params.getAll(key).length > 1) return invalid(key, "Repeated query parameters are not allowed.");
  }

  const parsedFrom = timestamp(params.get("from"), "from");
  if (parsedFrom.status !== "ok") return parsedFrom;
  const parsedTo = timestamp(params.get("to"), "to");
  if (parsedTo.status !== "ok") return parsedTo;
  const action = text(params.get("action"), "action", 120);
  if (action.status !== "ok") return action;
  const adminEmail = text(params.get("adminEmail"), "adminEmail", 320);
  if (adminEmail.status !== "ok") return adminEmail;
  const targetType = text(params.get("targetType"), "targetType", 120);
  if (targetType.status !== "ok") return targetType;
  const targetEmail = text(params.get("targetEmail"), "targetEmail", 320);
  if (targetEmail.status !== "ok") return targetEmail;

  const to = parsedTo.data ?? now.toISOString();
  const from = parsedFrom.data ?? new Date(new Date(to).getTime() - 7 * dayMs).toISOString();
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (start >= end || end > now.getTime() || end - start > 90 * dayMs) {
    return invalid("from", "Use a past time range of more than zero and at most 90 days.");
  }

  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? 50 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return invalid("limit", "Limit must be an integer from 1 to 100.");

  const scope: AdminAuditScope = {
    from,
    to,
    action: action.data,
    adminEmail: adminEmail.data,
    targetType: targetType.data,
    targetEmail: targetEmail.data,
  };
  const cursor = decodeCursor(params.get("cursor"), scope);
  if (cursor.status !== "ok") return cursor;
  return { status: "ok", data: { scope, limit, cursor: cursor.data } };
}
