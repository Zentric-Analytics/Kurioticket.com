// Visual QA ONLY. No live identities, sessions or customer data.
const day = 86_400_000;
const pivot = Date.parse("2026-10-22T15:00:00.000Z");
const users = [
  { id: "qa-admin-001", name: "Alana Example", email: "alana@example.invalid", role: "ADMIN", status: "ACTIVE", createdAt: new Date(pivot - 2 * day) },
  { id: "qa-support-001", name: "Zara Example", email: "zara@example.invalid", role: "SUPPORT", status: "ACTIVE", createdAt: new Date(pivot - 15 * day) },
];
const guests = Array.from({ length: 28 }, (_, index) => ({
  id: "qa-guest-" + String(index + 1).padStart(3, "0"),
  firstSeenAt: new Date(pivot - index * 3_600_000),
  lastSeenAt: new Date(pivot - index * 3_600_000 + 900_000),
}));
let filteredUsers = users;
let filteredGuests = guests;

function matchSearch(where, record) {
  const term = where?.OR?.[0]?.email?.contains || where?.OR?.[0]?.id?.contains || where?.id?.contains;
  return !term || [record.name, record.email, record.id].some(value => (value || "").toLowerCase().includes(String(term).toLowerCase()));
}
const db = {
  user: {
    async count({ where }) {
      filteredUsers = users.filter(user => (!where.role || user.role === where.role)
        && (!where.status || user.status === where.status)
        && matchSearch(where, user));
      return filteredUsers.length;
    },
    async findMany({ where }) {
      return users.filter(user => where.id.in.includes(user.id) && matchSearch(where, user));
    },
  },
  visitor: {
    async count({ where }) {
      filteredGuests = guests.filter(guest => matchSearch(where, guest));
      return filteredGuests.length;
    },
    async findMany({ where }) {
      return guests.filter(guest => where.id.in.includes(guest.id) && matchSearch(where, guest));
    },
  },
  async $queryRaw(sql) {
    const statement = sql.strings.join("?");
    const all = [
      ...(statement.includes('FROM "User"') ? filteredUsers.map(record => ({ kind: "user", record })) : []),
      ...(statement.includes('FROM "Visitor"') ? filteredGuests.map(record => ({ kind: "guest", record })) : []),
    ];
    const name = row => row.kind === "guest" ? "Guest visitor" : row.record.name || "Unnamed user";
    const created = row => +(row.kind === "guest" ? row.record.firstSeenAt : row.record.createdAt);
    all.sort((a, b) => {
      if (statement.includes('ORDER BY lower("displayName") ASC')) {
        return name(a).localeCompare(name(b)) || created(b) - created(a) || a.record.id.localeCompare(b.record.id);
      }
      if (statement.includes('ORDER BY lower("displayName") DESC')) {
        return name(b).localeCompare(name(a)) || created(b) - created(a) || a.record.id.localeCompare(b.record.id);
      }
      if (statement.includes('ORDER BY "joinedAt" ASC')) return created(a) - created(b) || a.record.id.localeCompare(b.record.id);
      return created(b) - created(a) || a.record.id.localeCompare(b.record.id);
    });
    const limit = sql.values.at(-2);
    const offset = sql.values.at(-1);
    return all.slice(offset, offset + limit).map(item => ({ id: item.record.id, kind: item.kind }));
  },
};
export async function withOptionalDb(callback) {
  return callback(db);
}
