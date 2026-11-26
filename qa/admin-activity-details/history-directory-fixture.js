// Synthetic directory data for real-route browser QA. No production records.
export async function loadAdminHistoryDirectory(section, query, now) {
  const user = { kind: "user", id: "qa-registered-0001", name: "QA registered customer", email: "customer.qa@example.invalid", count: query.range === "all" ? 5 : 4, lastSeenAt: now };
  const account = { kind: "user", id: "qa-page-history-0001", name: "QA page history customer", email: "page-history.qa@example.invalid", count: query.platform === "ios" ? 15 : 45, lastSeenAt: new Date("2026-10-22T18:00:00Z") };
  const guest = { kind: "guest", id: "qa-page-history-guest", name: "Guest visitor", email: null, count: 4, lastSeenAt: new Date("2026-10-22T17:59:00Z") };
  const other = Array.from({length:21}, (_, i) => ({ kind: "user", id: "qa-extra-account-"+i, name: "QA account "+i, email: "extra"+i+"@example.invalid", count: 2, lastSeenAt: new Date(Date.parse("2026-10-21T00:00:00Z")-i*60000) }));
  const guestAccess = { ...guest, guestSource: "consented", count: 2, lastSeenAt: now };
  const operational = { kind: "guest", id: "12345678-1234-4123-8123-123456789abc", name: "Guest session", email: null, guestSource: "operational", count: 1, lastSeenAt: now };
  const deviceRows = [
    ...(query.platform === "all" || query.platform === "ios" || query.platform === "desktop"
      ? [{ ...user, count: query.platform === "ios" ? 2 : query.platform === "desktop" ? (query.range === "all" ? 3 : 2) : user.count }] : []),
    ...(query.platform === "all" || query.platform === "ios" ? [guestAccess] : []),
    ...(query.platform === "all" || query.platform === "android" ? [operational] : []),
  ];
  const source = section === "devices" ? deviceRows : query.range === "today" ? [] : [account, guest, ...other];
  const rows = source.filter(row => (query.tab === "all" || (query.tab === "registered" ? row.kind === "user" : row.kind === "guest"))
    && (!query.q || [row.name,row.email,row.id].join(" ").toLowerCase().includes(query.q.toLowerCase())));
  return {status:"ok",rows:rows.slice((query.page-1)*20,query.page*20),total:rows.length};
}

export async function loadAdminGuestAccessHistory(id, query) {
  const now = new Date();
  const consented = id === "qa-page-history-guest";
  const operational = id === "12345678-1234-4123-8123-123456789abc";
  const platform = consented ? "ios" : "android";
  const source = consented ? "consented" : "operational";
  const records = (consented || operational) && (!query.platform || query.platform === "all" || query.platform === platform)
    ? Array.from({ length: consented ? 2 : 1 }, (_, i) => ({
      id: "access-" + i, source, evidence: consented ? "page" : "search",
      platform: consented ? "iOS app" : "Android app", at: new Date(+now - i * 1000),
      deviceLabel: consented ? "iOS device" : null, os: consented ? "iOS" : null, browser: null, locationLabel: operational ? "Nigeria" : null,
    })) : [];
  return { status: "ok", records: records.slice((query.page - 1) * 20, query.page * 20), total: records.length,
    firstSeenAt: records.at(-1)?.at ?? null, lastSeenAt: records[0]?.at ?? null };
}
