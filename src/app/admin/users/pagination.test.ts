import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import React, { type ReactNode } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as identity from "../../../lib/adminIdentityDirectory";
import * as pagination from "../../../lib/adminUsersDirectoryPagination";
import * as navigation from "../../../lib/adminUsersNavigation";
import type { IdentityRow } from "../../../components/admin/AdminIdentityTable";

const now = new Date("2026-11-27T12:00:00.000Z");
type User = Extract<IdentityRow, { kind: "user" }>["record"];
type Guest = Extract<IdentityRow, { kind: "guest" }>["record"];
class Redirect extends Error { constructor(readonly href: string) { super(href); } }

/** Execute the real server route with explicit DB/UI boundaries. The SQL itself
 * is separately exercised against PostgreSQL, including its combined ordering. */
function fixture(size = 45, queryFailure = false) {
  const users: User[] = [];
  const guests: Guest[] = [];
  const ordered: identity.AdminIdentityDirectoryRow[] = [];
  for (let index = 0; index < size; index += 1) {
    const kind = index % 3 === 0 ? "user" : "guest";
    const source = index % 3 === 1 ? "visitor" : index % 3 === 2 ? "operational" : null;
    const id = "fixture-" + String(index).padStart(3, "0");
    const firstSeenAt = new Date("2026-11-01T09:00:00Z");
    const lastSeenAt = new Date(+now - (index + 1) * 60_000);
    if (kind === "user") users.push({ id, name: "Fixture " + index, email: id + "@example.invalid", role: index % 2 ? "ADMIN" : "USER", status: "ACTIVE", createdAt: firstSeenAt });
    if (source === "visitor") guests.push({ id, firstSeenAt, lastSeenAt });
    ordered.push({ kind, id, firstSeenAt: kind === "guest" ? firstSeenAt : null, lastSeenAt,
      guestSource: source, guestStatus: kind === "guest" ? "ACTIVE" : null,
      operationalGuestCount: BigInt(0), operationalAllTimeCount: BigInt(0), operationalNewCount: BigInt(0) });
  }
  const requests: identity.AdminIdentityPageRequest[] = [];
  const hydrated: { kind: string; ids: string[] }[] = [];
  const locations: string[][] = [];
  const transactionOptions: unknown[] = [];
  let inTransaction = false;
  let authorized = 0;
  let populationReads = 0;
  let caught: unknown;
  let table: { rows: IdentityRow[]; pageHref: string } | undefined;
  let toolbar: { registeredCount: number; guestCount: number; pageHref: string; date: string } | undefined;
  const userMatches = (where: { role?: string; status?: string }, row: User) => (!where.role || where.role === row.role) && (!where.status || where.status === row.status);
  const tx = {
    user: {
      count: async ({ where }: { where: { role?: string; status?: string } }) => {
        assert.equal(inTransaction, true); return users.filter(row => userMatches(where, row)).length;
      },
      findMany: async ({ where }: { where: { id: { in: string[] }; role?: string; status?: string } }) => {
        assert.equal(inTransaction, true); hydrated.push({ kind: "user", ids: where.id.in });
        return users.filter(row => where.id.in.includes(row.id) && userMatches(where, row)).reverse();
      },
    },
    visitor: {
      count: async () => { assert.equal(inTransaction, true); return guests.length; },
      findMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        assert.equal(inTransaction, true); hydrated.push({ kind: "guest", ids: where.id.in });
        return guests.filter(row => where.id.in.includes(row.id)).reverse();
      },
    },
    $queryRaw: async () => {
      assert.equal(inTransaction, true);
      if (queryFailure) throw new Error("Unavailable database");
      const query = requests.at(-1)!;
      const operational = ordered.filter(row => row.guestSource === "operational");
      const scopedOperational = operational.filter(row => query.status === "ALL" || query.status === row.guestStatus);
      const matchingUsers = new Set(users.filter(row => userMatches({ role: query.role === "ALL" ? undefined : query.role,
        status: query.status === "ALL" ? undefined : query.status }, row)).map(row => row.id));
      const selected = ordered.filter(row => row.kind === "user" ? query.showUsers && matchingUsers.has(row.id!)
        : row.guestSource === "visitor" ? query.showGuests
        : query.showOperationalGuests && scopedOperational.includes(row));
      const meta = { operationalGuestCount: BigInt(scopedOperational.length), operationalAllTimeCount: BigInt(operational.length), operationalNewCount: BigInt(operational.length) };
      const rows = selected.slice(query.offset, query.offset + query.limit);
      return rows.length ? rows.map(row => ({ ...row, ...meta })) : [{ kind: null, id: null, firstSeenAt: null,
        lastSeenAt: null, guestSource: null, guestStatus: null, ...meta }];
    },
  };
  const db = { $transaction: async (run: (tx: unknown) => Promise<unknown>, options: unknown) => {
    transactionOptions.push(options); inTransaction = true;
    try { return await run(tx); } finally { inTransaction = false; }
  } };
  const component = (name: string) => ({ [name]: (props: Record<string, unknown>) => {
    if (name === "AdminIdentityTable") table = props as typeof table;
    if (name === "AdminUsersToolbar") toolbar = props as typeof toolbar;
    return React.createElement(React.Fragment, null, props.children as ReactNode);
  } });
  const modules: Record<string, unknown> = {
    "react/jsx-runtime": jsxRuntime,
    "next/link": { __esModule: true, default: ({ href, children }: { href: string; children: ReactNode }) => React.createElement("a", { href }, children) },
    "next/navigation": { redirect: (href: string) => { assert.equal(inTransaction, false, "redirects run after the read snapshot completes"); throw new Redirect(href); } },
    "@/components/admin/AdminIdentityTable": component("AdminIdentityTable"),
    "@/components/admin/AdminUsersToolbar": component("AdminUsersToolbar"),
    "@/components/admin/AdminUserPopulationCards": component("AdminUserPopulationCards"),
    "@/services/adminUserPopulationMetrics": { readUserPopulationMetrics: async () => { populationReads += 1; return {}; } },
    "@/lib/prisma": { withOptionalDb: async (run: (db: unknown) => Promise<unknown>, fallback: unknown) => {
      try { return await run(db); } catch (error) { caught = error; return fallback; }
    } },
    "@/services/adminGuestRecordedLocationsService": {
      loadAdminGuestRecordedLocations: async (ids: string[]) => { locations.push(ids); return new Map(); },
      guestRecordedLocationKey: (id: string, source: string) => source + ":" + id,
    },
    "@/lib/adminViewerTimeZone.server": { getAdminViewerTimeZone: async () => "UTC" },
    "@/lib/adminLocalTime": { formatAdminTimeZoneLabel: () => "UTC" },
    "@/lib/auth-guards": { requireAdminSession: async () => { authorized += 1; return { user: { id: "fixture-admin" } }; } },
    "@/lib/stagingSafety": { getPublicEnvironment: () => "staging" },
    "@/lib/adminIdentityDirectory": { ...identity, adminIdentityPageSql: (input: identity.AdminIdentityPageRequest) => {
      requests.push(input); return identity.adminIdentityPageSql(input);
    } },
    "@/lib/adminUsersDirectoryPagination": pagination,
    "@/lib/adminUsersNavigation": navigation,
  };
  const output = ts.transpileModule(readFileSync("src/app/admin/users/page.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} as { default: (props: { searchParams: Promise<Record<string, unknown>> }) => Promise<ReactNode> } };
  class FixedDate extends Date { constructor(value?: string | number) { super(value === undefined ? +now : value); } }
  new Function("require", "module", "exports", "Date", output)((name: string) => {
    assert.ok(Object.hasOwn(modules, name), "Unexpected route dependency: " + name); return modules[name];
  }, loaded, loaded.exports, FixedDate);
  return { requests, hydrated, locations, transactionOptions,
    authorized: () => authorized, populationReads: () => populationReads, error: () => caught,
    table: () => table!, toolbar: () => toolbar!,
    async render(params: Record<string, unknown> = {}) {
      return renderToStaticMarkup(await loaded.exports.default({ searchParams: Promise.resolve(params) }));
    },
  };
}

test("the real Users route reads twenty mixed identities in one snapshot and enriches only the current page", async () => {
  const h = fixture();
  const html = await h.render({ page: "2", date: "all", q: "fixture", sort: "newest" });
  assert.equal(h.error(), undefined);
  assert.equal(h.authorized(), 1);
  assert.deepEqual(h.transactionOptions, [{ isolationLevel: "RepeatableRead" }]);
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].limit, 20);
  assert.equal(h.requests[0].offset, 20);
  assert.equal(h.requests[0].allIdentities, undefined);
  assert.equal(h.requests[0].withOperationalSummary, true);
  assert.equal(h.requests[0].environment, "staging");
  assert.deepEqual(h.table().rows.map(row => row.record.id), Array.from({ length: 20 }, (_, index) => "fixture-" + String(index + 20).padStart(3, "0")), "ORM hydration order cannot replace the authoritative mixed SQL order");
  const selected = new Set(h.table().rows.map(row => row.record.id));
  assert.ok(h.hydrated.flatMap(read => read.ids).every(id => selected.has(id)));
  assert.deepEqual(h.locations, [h.table().rows.filter(row => row.kind === "guest").map(row => row.record.id)]);
  assert.equal(h.toolbar().registeredCount, 15);
  assert.equal(h.toolbar().guestCount, 30);
  assert.equal(new URL(h.table().pageHref, "https://fixture.invalid").searchParams.get("page"), "2");
  assert.match(html, /Showing 21–40 of 45 matching identities/);
  assert.match(html, /Page 2 of 3/);
  assert.match(html, /page=3/);
});

test("all remaining identities are reachable on the last page and tab counts retain their independent scopes", async () => {
  const h = fixture();
  const html = await h.render({ page: "3", date: "all" });
  assert.equal(h.table().rows.length, 5);
  assert.match(html, /Showing 41–45 of 45 matching identities/);
  assert.match(html, /aria-disabled="true"[^>]*>Next/);
  const guests = fixture();
  await guests.render({ tab: "GUEST", page: "2", date: "all" });
  assert.equal(guests.table().rows.length, 10);
  assert.equal(guests.table().rows.every(row => row.kind === "guest"), true);
  assert.equal(guests.toolbar().registeredCount, 15);
  assert.equal(guests.toolbar().guestCount, 30);
});

test("out-of-range pages redirect to the last matching page with the exact filters before hydration", async () => {
  const h = fixture();
  const filters = { page: "100", q: "fixture", role: "ADMIN", status: "ACTIVE", tab: "REGISTERED", sort: "name_desc", date: "custom", from: "2026-11-20", to: "2026-11-27" };
  await assert.rejects(h.render(filters), (error: unknown) => {
    assert.ok(error instanceof Redirect);
    const url = new URL(error.href, "https://fixture.invalid");
    assert.equal(url.searchParams.has("page"), false, "seven matching admins fit on page one");
    for (const [key, value] of Object.entries(filters)) if (key !== "page") assert.equal(url.searchParams.get(key), value);
    return true;
  });
  assert.equal(h.requests.length, 1, "summary metadata survives an empty requested slice");
  assert.equal(h.requests[0].offset, 1980);
  assert.deepEqual(h.hydrated, []);
  assert.deepEqual(h.locations, []);
  assert.equal(h.populationReads(), 0);
});

test("invalid page syntax is normalized without broadening filters and Today stays the default", async () => {
  for (const page of ["0", "-1", "1.2", ["2", "3"]]) {
    const h = fixture();
    await assert.rejects(h.render({ page, q: "fixture", tab: "GUEST", status: "ACTIVE" }), (error: unknown) => {
      assert.ok(error instanceof Redirect);
      const query = new URL(error.href, "https://fixture.invalid").searchParams;
      assert.equal(query.get("q"), "fixture");
      assert.equal(query.get("tab"), "GUEST");
      assert.equal(query.get("status"), "ACTIVE");
      assert.equal(query.get("date"), "today");
      assert.equal(query.has("page"), false);
      return true;
    });
    assert.equal(h.requests.length, 0);
  }
  const h = fixture();
  await h.render();
  assert.equal(h.requests[0].date, "today");
  assert.equal(h.requests[0].limit, 20);
  assert.equal(h.toolbar().date, "today");
});

test("legacy drawer bookmarks preserve long Unicode filters and the requested page in modern return context", async () => {
  const h = fixture();
  const q = "旅".repeat(120);
  await assert.rejects(h.render({ activity: "user:fixture-012", q, page: "2", tab: "REGISTERED", role: "ADMIN",
    status: "ACTIVE", sort: "name_desc", date: "custom", from: "2026-11-20", to: "2026-11-26" }), (error: unknown) => {
    assert.ok(error instanceof Redirect);
    const url = new URL(error.href, "https://fixture.invalid");
    assert.equal(url.pathname, "/admin/users/user/fixture-012/activity");
    assert.equal(url.searchParams.get("range"), "custom");
    assert.equal(url.searchParams.get("from"), "2026-11-20");
    assert.equal(url.searchParams.get("to"), "2026-11-26");
    assert.equal(url.searchParams.has("directory"), false);
    const back = new URL(url.searchParams.get("usersReturn")!, "https://fixture.invalid");
    assert.equal(back.searchParams.get("q"), q);
    assert.equal(back.searchParams.get("page"), "2");
    assert.equal(back.searchParams.get("role"), "ADMIN");
    assert.equal(back.searchParams.get("status"), "ACTIVE");
    assert.equal(back.searchParams.get("tab"), "REGISTERED");
    assert.equal(back.searchParams.get("date"), "custom");
    assert.equal(back.searchParams.get("from"), "2026-11-20");
    assert.equal(back.searchParams.get("to"), "2026-11-26");
    return true;
  });
  assert.equal(h.requests.length, 0);
});

test("empty or role-incompatible cohorts stay genuinely empty while database failures stay unavailable", async () => {
  const empty = fixture(0);
  assert.match(await empty.render(), /0 matching identities/);
  assert.equal(empty.table().rows.length, 0);
  assert.deepEqual(empty.hydrated, []);
  const incompatible = fixture();
  assert.match(await incompatible.render({ role: "ADMIN", tab: "GUEST", date: "all" }), /0 matching identities/);
  assert.equal(incompatible.toolbar().registeredCount, 7);
  assert.equal(incompatible.toolbar().guestCount, 0);
  assert.equal(incompatible.table().rows.length, 0);
  const failed = fixture(45, true);
  const html = await failed.render({ page: "2", q: "fixture", date: "all" });
  assert.match(html, /Users directory unavailable/);
  assert.doesNotMatch(html, /0 matching identities/);
  assert.deepEqual(failed.hydrated, []);
  assert.deepEqual(failed.locations, []);
});
