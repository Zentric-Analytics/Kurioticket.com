import type { PlatformOperations } from "../../src/components/admin/PlatformHealthDashboard";
import { partitionOperationalGroups } from "../../src/services/platformOperationsContract";
import {
    encodeAdminOperationalCursor,
    parseAdminSearchActivityQuery,
    type AdminSearchActivityRead,
    type AdminSearchActivityScope,
} from "../../src/services/adminOperationalReadContract";
export function platformFixture(unavailable = false): PlatformOperations {
    const activity = partitionOperationalGroups([...["WEB", "IOS", "ANDROID", null].flatMap(source => ["searches", "handoffs", "providerCalls"].map(kind => ({ kind, source, status: "SUCCESS", count: 12, latency: 0, latencyCount: 0 }))), { kind: "searches", source: "BOT", status: "SUCCESS", count: 7, latency: 0, latencyCount: 0 }]);
    return { environment: "staging", window: { from: "2026-11-15T00:00:00.000Z", to: "2026-11-16T00:00:00.000Z" }, activity: { state: unavailable ? "MONITORING_UNAVAILABLE" : "AVAILABLE", data: unavailable ? null : activity }, botSearches: unavailable ? null : 7, database: { state: unavailable ? "FAILING" : "HEALTHY" }, providerHealth: null, email: { state: "MONITORING_UNAVAILABLE" }, cms: { state: "MONITORING_UNAVAILABLE" }, alerts: null, release: null, nativeApplicationHealth: { state: "UNKNOWN", reason: "No installed-app crash or device-health evidence source configured." }, scheduledJobs: { state: unavailable ? "MONITORING_UNAVAILABLE" : "OBSERVED", runs: unavailable ? null : [{ job: "price-alerts", status: "DEGRADED", observedAt: "2026-11-15T01:00:00.000Z", outcome: "RUNNING", environment: "staging", completedAt: null, durationMs: null }, { job: "homepage-fares", status: "FAILED", observedAt: "2026-11-15T02:00:00.000Z", outcome: "FAILED", environment: "staging", completedAt: "2026-11-15T02:00:01.000Z", durationMs: 1000 }] } } as PlatformOperations;
}

const searches: AdminSearchActivityRead[] = (["WEB", "IOS", "ANDROID", "BOT", undefined] as const)
    .map((applicationSource, index) => ({
        id: "search_qa00" + index,
        applicationSource,
        appVersion: applicationSource === "IOS" ? "1.2.3" : undefined,
        requestId: null,
        operationalSessionId: null,
        identity: {
            kind: applicationSource === "WEB" ? "registered" : applicationSource === "BOT" ? "bot" : "guest",
            userId: applicationSource === "WEB" ? "user_qa000" : null,
            visitorId: null,
        },
        product: "FLIGHT",
        origin: "LOS",
        destination: "LHR",
        checkIn: null,
        checkOut: null,
        resultCount: 2,
        latencyMs: null,
        status: "SUCCESS",
        providers: [],
        providerTelemetry: null,
        market: "NG",
        currency: "USD",
        environment: "staging",
        createdAt: `2026-11-15T${18 - index}:00:00.000Z`,
    }));

function matchingSearches(scope: AdminSearchActivityScope) {
    return searches.filter(row => (!scope.applicationSource || (row.applicationSource ?? "UNKNOWN") === scope.applicationSource)
        && (scope.identity === "all" || row.identity.kind === scope.identity)
        && (!scope.product || row.product === scope.product)
        && (!scope.from || row.createdAt >= scope.from)
        && (!scope.to || row.createdAt < scope.to));
}

export const stage06SearchActivityReads = {
    async list(params: URLSearchParams) {
        const parsed = parseAdminSearchActivityQuery(params, "staging");
        if (parsed.status !== "ok") return parsed;
        const { scope, cursor } = parsed.data;
        const selected = matchingSearches(scope).filter(row => !cursor || row.createdAt < cursor.at);
        // Exercise the real client pagination route with a small fixture.
        const items = selected.slice(0, 2);
        const last = items.at(-1);
        const nextCursor = selected.length > items.length && last
            ? encodeAdminOperationalCursor("searches", scope, { at: last.createdAt, id: last.id }) : null;
        return { status: "ok", data: { scope, items, nextCursor } };
    },
    async summary(params: URLSearchParams) {
        const parsed = parseAdminSearchActivityQuery(params, "staging");
        if (parsed.status !== "ok") return parsed;
        const { scope } = parsed.data;
        const total = matchingSearches(scope).length;
        return { status: "ok", data: { scope, total, success: total, partial: 0, failed: 0 } };
    },
    async detail(id: string) {
        const row = searches.find(search => search.id === id);
        if (!row) return { status: "not_found" };
        return { status: "ok", data: {
            ...row,
            crawler: row.identity.kind === "bot" ? { name: "GOOGLEBOT", evidence: "DECLARED_USER_AGENT" } : null,
            diagnostic: { outcome: "SUCCESS", reasonCode: "SEARCH_SUCCEEDED", reason: "QA fixture successful search.", retryable: false, correlation: "exact", providers: [] },
            searcher: row.identity.userId
                ? { name: "QA customer", email: null, activity: { kind: "user", id: row.identity.userId } }
                : { name: null, email: null, activity: null },
        } };
    },
};
