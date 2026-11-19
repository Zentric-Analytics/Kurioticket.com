import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@/generated/prisma/client";
import { applicationMetadata } from "@/lib/application-source";
import { parseAdminSearchQuery, encodeAdminOperationalCursor } from "./adminOperationalReadContract";
import { createAdminOperationalReadService, __adminOperationalReadCoreTest } from "./adminOperationalReadCore";
for (const source of ["WEB", "IOS", "ANDROID", "UNKNOWN"] as const)
    test(`search source ${source} uses one bound SQL predicate for list and summary before pagination`, async () => {
        const queries: Prisma.Sql[] = [];
        const rows = [0, 1].map(i => ({ id: `search_00${i}`, requestId: null, userId: null, visitorId: null, visitor: null, type: "FLIGHT", origin: "LOS", destination: "LHR", checkIn: null, checkOut: null, query: { environment: "staging", applicationSource: source, appVersion: i ? "bad version" : "1.2.3" }, resultCount: 2, latencyMs: null, status: "SUCCESS", createdAt: new Date(`2026-11-01T00:00:0${2 - i}Z`) }));
        const db = {
            $queryRaw: async (sql: Prisma.Sql) => { queries.push(sql); return sql.sql.includes('GROUP BY') ? [{ status: "SUCCESS", count: BigInt(2) }] : rows.filter(row => !sql.values.includes(rows[0].id) || row.id !== rows[0].id).map(r => ({ id: r.id })); },
            searchHistory: { findFirst: async (args: {where:{id:string;query:{equals:string}}}) => { assert.equal(args.where.query.equals,"staging"); return rows.find(row=>row.id===args.where.id)??null; }, findMany: async (args: {
                    where: {
                        id: {
                            in: string[];
                        };
                    };
                    take: number;
                }) => { assert.ok(args.where.id.in.length <= 2); assert.equal(args.take, 2); return rows.filter(row => args.where.id.in.includes(row.id)); } },
        };
        const api = createAdminOperationalReadService({ authorize: async () => true, database: () => db as never, environment: () => "staging" });
        const params = new URLSearchParams({ applicationSource: source, product: "FLIGHT", status: "SUCCESS", limit: "1" });
        const list = await api.searches.list(params), summary = await api.searches.summary(params);
        assert.equal(list.status, "ok");
        assert.equal(summary.status, "ok");
        if (list.status !== "ok" || summary.status !== "ok")
            throw Error("Read failed");
        assert.equal(list.data.items.length, 1);
        assert.equal(list.data.items[0].applicationSource, source);
        assert.equal(list.data.items[0].appVersion, "1.2.3");
        assert.equal(summary.data.total, 2);
        const detail=await api.searches.detail(rows[0].id,new URLSearchParams());assert.equal(detail.status,"ok");if(detail.status!=="ok")throw Error("Detail failed");assert.equal(detail.data.applicationSource,source);assert.equal(detail.data.appVersion,"1.2.3");
        assert.ok(list.data.nextCursor);
        const where = (q: Prisma.Sql) => q.sql.slice(q.sql.indexOf('WHERE'), q.sql.indexOf('ORDER BY') >= 0 ? q.sql.indexOf('ORDER BY') : q.sql.indexOf('GROUP BY')).trim();
        assert.equal(where(queries[0]), where(queries[1]));
        assert.ok(queries.every(q => q.values.includes(source) && q.values.includes("staging")));
        assert.match(queries[0].sql, /CASE WHEN.*applicationSource/);
        assert.match(queries[0].sql, /ELSE 'UNKNOWN'/);
        assert.match(queries[0].sql, /ORDER BY[\s\S]*LIMIT/);
        assert.doesNotMatch(queries[0].sql, /requestId.*IS NOT NULL/);
        const same = new URLSearchParams(params);
        same.set("cursor", list.data.nextCursor!);
        assert.equal(parseAdminSearchQuery(same, "staging").status, "ok");
        const next = await api.searches.list(same);
        assert.equal(next.status, "ok");
        if (next.status !== "ok")
            throw Error("Next page failed");
        assert.equal(next.data.items[0].id, rows[1].id);
        assert.equal(next.data.items[0].appVersion, undefined);
        assert.equal(next.data.nextCursor, null);
        assert.ok(queries[2].values.includes(rows[0].id));
        same.set("applicationSource", source === "WEB" ? "IOS" : "WEB");
        assert.equal(parseAdminSearchQuery(same, "staging").status, "invalid");
    });
test("source parsing, legacy normalization, combined behavior and cursor scope stay strict", () => {
    for (const query of ["applicationSource=web", "applicationSource=native", "applicationSource=WEB&applicationSource=IOS"])
        assert.equal(parseAdminSearchQuery(new URLSearchParams(query), "staging").status, "invalid");
    for (const value of [undefined, null, {}, [], 12, "web", "native"])
        assert.equal(applicationMetadata({ applicationSource: value } as never).applicationSource, "UNKNOWN");
    const parsed = parseAdminSearchQuery(new URLSearchParams("provider=Duffel&applicationSource=UNKNOWN"), "staging");
    assert.equal(parsed.status, "ok");
    if (parsed.status !== "ok")
        throw Error("invalid fixture");
    const sql = __adminOperationalReadCoreTest.exactProviderFilteredSearchSql(parsed.data.scope);
    assert.match(sql.sql, /EXISTS/);
    assert.ok(sql.values.includes("Duffel"));
    assert.ok(sql.values.includes("UNKNOWN"));
    assert.match(sql.sql, /environment/);
    const cursor = encodeAdminOperationalCursor("searches", parsed.data.scope, { at: "2026-11-01T00:00:00Z", id: "search_001" });
    assert.equal(parseAdminSearchQuery(new URLSearchParams({ cursor }), "staging").status, "invalid");
    assert.equal(parseAdminSearchQuery(new URLSearchParams(), "staging").status, "ok");
});

test("empty source windows retain known zero counts and never fabricate records", async()=>{
 const api=createAdminOperationalReadService({authorize:async()=>true,environment:()=>"staging",database:()=>({$queryRaw:async()=>[],searchHistory:{findMany:async()=>{throw Error("Empty ID window must not fetch unrestricted records");}}}) as never});
 const params=new URLSearchParams("applicationSource=UNKNOWN"); const list=await api.searches.list(params), summary=await api.searches.summary(params);
 assert.equal(list.status,"ok");assert.equal(summary.status,"ok");if(list.status!=="ok"||summary.status!=="ok")throw Error("Empty read failed");assert.deepEqual(list.data.items,[]);assert.equal(list.data.nextCursor,null);assert.equal(summary.data.total,0);
});
