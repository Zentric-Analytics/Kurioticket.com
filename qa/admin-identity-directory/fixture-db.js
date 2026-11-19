// Isolated browser-test fixtures. Never imported by the production application.
const statuses = ["ACTIVE", "SUSPENDED", "DELETED", "PENDING_DELETION"];
const records = Array.from({ length: 31 }, (_, i) => {
  const at = new Date(Date.UTC(2026, 9, 22, 12, -i));
  const kind = i % 3 === 0 ? "guest" : "user";
  const record =
    kind === "guest"
      ? {
          id: `qa-guest-${i.toString().padStart(2, "0")}-long-identifier-for-truncation-check`,
          firstSeenAt: at,
          lastSeenAt: at,
        }
      : {
          id: i === 1 ? "qa-self" : `qa-user-${i.toString().padStart(2, "0")}`,
          name:
            i === 4
              ? "QA registered identity with a deliberately long display name"
              : `QA registered identity ${i.toString().padStart(2, "0")}`,
          email:
            i === 2
              ? "qa-protected@example.invalid"
              : i === 5 || i === 14
                ? null
                : `qa-${i.toString().padStart(2, "0")}-long-email-address@example.invalid`,
          role:
            i === 1 || i === 2 || i === 7
              ? "ADMIN"
              : i === 8
                ? "SUPPORT"
                : "USER",
          status: statuses[i % 4],
          createdAt: at,
        };
  return { kind, record };
});
function matches(record, where = {}) {
  if (where.id?.in && !where.id.in.includes(record.id)) return false;
  if (
    where.id?.contains &&
    !record.id.toLowerCase().includes(where.id.contains.toLowerCase())
  )
    return false;
  if (where.role && record.role !== where.role) return false;
  if (where.status && record.status !== where.status) return false;
  if (
    where.OR &&
    !where.OR.some((clause) =>
      Object.entries(clause).some(([key, value]) =>
        String(record[key] || "")
          .toLowerCase()
          .includes(value.contains.toLowerCase()),
      ),
    )
  )
    return false;
  return true;
}
const model = (kind) => ({
  count: async ({ where } = {}) =>
    records.filter((r) => r.kind === kind && matches(r.record, where)).length,
  findMany: async ({ where } = {}) =>
    records
      .filter((r) => r.kind === kind && matches(r.record, where))
      .map((r) => r.record),
  findUnique: async ({ where }) =>
    records.find((r) => r.kind === kind && r.record.id === where.id)?.record ||
    null,
  findFirst: async ({ where }) =>
    records.find((r) => r.kind === kind && matches(r.record, where))?.record ||
    null,
});
const empty = { findMany: async () => [] };
const db = {
  user: model("user"),
  visitor: model("guest"),
  searchHistory: empty,
  redirectLog: empty,
  analyticsEvent: empty,
  journeyEvent: empty,
  $queryRaw: async (sql) => {
    const text = sql.strings.join("?");
    const values = sql.values;
    const limit = values.at(-2);
    const offset = values.at(-1);
    const role = values.find((v) => ["USER", "SUPPORT", "ADMIN"].includes(v));
    const status = values.find((v) => statuses.includes(v));
    const query = text.includes("strpos")
      ? String(values[0]).toLowerCase()
      : "";
    return records
      .filter(
        (r) =>
          (r.kind === "user"
            ? text.includes('FROM "User"')
            : text.includes('FROM "Visitor"')) &&
          (!role || r.record.role === role) &&
          (!status || r.record.status === status) &&
          (!query ||
            [r.record.id, r.record.name, r.record.email].some((v) =>
              v?.toLowerCase().includes(query),
            )),
      )
      .slice(offset, offset + limit)
      .map((r) => ({ kind: r.kind, id: r.record.id }));
  },
};
export async function withOptionalDb(task) {
  return task(db);
}
