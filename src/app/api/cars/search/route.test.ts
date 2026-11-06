import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test, { type TestContext } from "node:test";
import ts from "typescript";
import { attachOperationalSearchSession, type PreparedOperationalSession } from "@/lib/operationalSearchSession";

const requestId = "78e1de9e-6dfe-494f-9fdb-83726d83bf64";
const query = {
  pickupLocation: "London Heathrow", dropoffLocation: "London Heathrow",
  pickupDate: "2099-05-01", pickupTime: "10:00",
  dropoffDate: "2099-05-02", dropoffTime: "10:00", driverAge: "30",
};

function fixture(t: TestContext, options: { status?: "available" | "unavailable"; consent?: boolean; failingLog?: boolean; failingProviderLog?: boolean; session?: boolean } = {}) {
  const deferred: Array<() => Promise<unknown>> = [];
  const histories: Array<Record<string, unknown>> = [];
  const analytics: Array<Record<string, unknown>> = [];
  const providerLogs: Array<Record<string, unknown>> = [];
  const contractErrors: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) contractErrors.push(message);
    assert.ok(condition, message);
  };
  // Production catches optional logging failures. Keep fixture-contract failures
  // visible outside those catches, including errors from deferred callbacks.
  t.after(() => assert.deepEqual(contractErrors, []));
  let identityCalls = 0;
  let searchCalls = 0;
  let prepareCalls = 0;
  let attachCalls = 0;
  let providerLogCalls = 0;
  const request = new Request("https://staging.kurioticket.com/api/cars/search", {
    method: "POST", headers: { "content-type": "application/json", "x-search-request-id": requestId },
    body: JSON.stringify(query),
  });
  const session: PreparedOperationalSession | null = options.session === false ? null : {
    reference: { id: "38d77b62-f43d-40d5-9597-a6ff76f02c28", expiresAt: new Date("2099-05-01"), environment: "staging" },
    credential: "fixture-session-credential", transport: "native", newCredential: true,
  };
  const provider = { provider: "fixture-provider", status: options.status === "unavailable" ? "failed" : "success", latencyMs: 12 };
  const fakeSearch = {
    results: options.status === "unavailable" ? [] : [{ id: "car-offer" }],
    status: options.status ?? "available", warnings: [], providerStatuses: [provider],
  };
  const dependencies: Record<string, unknown> = {
    "next/server": { after: (callback: () => Promise<unknown>) => { deferred.push(callback); } },
    "@/lib/operationalSearchSession": {
      prepareOperationalSearchSession: (value: Request) => {
        check(value === request && ++prepareCalls === 1, "prepare exactly one session for the actual request");
        return session;
      },
      attachOperationalSearchSession: (response: Response, value: PreparedOperationalSession | null) => {
        check(value === session && ++attachCalls === 1, "attach the prepared session exactly once");
        return attachOperationalSearchSession(response, value);
      },
    },
    "@/lib/search-journey": { resolveSearchRequestId: (value: string | null) => {
      check(value === requestId, "use the incoming request ID");
      return requestId;
    } },
    "@/services/requestActivityIdentity": { resolveRequestActivityIdentity: async (value: Request) => {
      check(value === request && identityCalls === 0, "resolve identity once for the actual request");
      identityCalls++;
      return options.consent === false ? { userId: null, visitorId: null } : { userId: null, visitorId: "consented-guest" };
    } },
    "@/services/analyticsService": {
      logSearchHistory: async (value: Record<string, unknown>) => {
        if (options.failingLog) throw new Error("database unavailable");
        histories.push(value);
      },
      trackAnalyticsEvent: async (value: Record<string, unknown>) => { analytics.push(value); },
      logProviderCall: async (value: Record<string, unknown>) => {
        check(++providerLogCalls === 1 && value.provider === provider.provider && value.service === "car-search", "log the actual provider exactly once");
        if (options.failingProviderLog) throw new Error("provider diagnostics unavailable");
        providerLogs.push(value);
      },
    },
    "@/lib/cars/carsSearchUtils": { validateCarsForm: () => ({}) },
    "@/services/travel/carAggregator": { searchCars: async (search: unknown, context: { requestId: string; kayak: { signal: AbortSignal; clientIp: unknown } }) => {
      check(++searchCalls === 1 && JSON.stringify(search) === JSON.stringify(query), "search exactly once with the submitted rental criteria");
      check(context.requestId === requestId && context.kayak.signal === request.signal && context.kayak.clientIp === null, "preserve request ID and provider request context");
      return fakeSearch;
    } },
    "@/lib/travel/searchContract": { classifyCars: (results: unknown, search: unknown, id: string, warnings: unknown) => {
      check(results === fakeSearch.results && warnings === fakeSearch.warnings && id === requestId && JSON.stringify(search) === JSON.stringify(query), "classify the actual provider result and request");
      return { results: fakeSearch.results, requestId };
    } },
    "@/lib/feature-controls/service": { isFeatureEnabled: async (name: string) => {
      check(name === "CAR_SEARCH_ENABLED", "check the Cars feature flag");
      return true;
    } },
    "@/lib/kayak-client-ip": { getKayakClientIp: (value: Request) => {
      check(value === request, "derive provider IP from the actual request");
      return null;
    } },
    "@/lib/locations/searchTargetSchema": { searchLocationSchema: { safeParse: () => ({ success: false }) } },
  };
  const compiled = ts.transpileModule(readFileSync(new URL("./route.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exported: { POST?: (request: Request) => Promise<Response> } = {};
  runInNewContext(compiled, {
    exports: exported,
    require: (name: string) => {
      check(Object.hasOwn(dependencies, name), "unexpected dependency: " + name);
      return dependencies[name];
    },
    Response, Request, URL, Date, crypto, performance,
  });
  return {
    histories, analytics, providerLogs, deferred, session, calls: () => identityCalls,
    post: () => exported.POST!(request),
    flush: async () => {
      assert.equal(deferred.length, 2, "history/analytics and provider diagnostics remain separate post-response tasks");
      for (const callback of deferred) await callback();
      assert.equal(searchCalls, 1);
      assert.equal(prepareCalls, 1);
      assert.equal(attachCalls, 1);
      assert.equal(providerLogCalls, 1);
    },
  };
}

test("car search records a consented history after returning provider results", async (t) => {
  const f = fixture(t);
  const response = await f.post();
  assert.equal(response.status, 200);
  assert.equal(f.calls(), 0);
  assert.equal(f.histories.length, 0);
  assert.equal(f.analytics.length, 0);
  assert.equal(f.providerLogs.length, 0);
  assert.equal(response.headers.get("X-Kt-Search-Session"), f.session!.credential);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.match(response.headers.get("Vary") ?? "", /X-Kt-Search-Session/);
  assert.deepEqual(await response.json(), { results: [{ id: "car-offer" }], requestId });
  await f.flush();
  assert.equal(f.histories.length, 1);
  assert.equal(f.histories[0].type, "CAR");
  assert.equal(f.histories[0].visitorId, "consented-guest");
  assert.equal(f.histories[0].requestId, requestId);
  assert.equal(f.histories[0].resultCount, 1);
  assert.equal(f.histories[0].status, "SUCCESS");
  assert.equal((f.histories[0].query as Record<string, unknown>).operationalSessionId, f.session!.reference.id);
  assert.equal(f.analytics[0].name, "car_search");
  assert.equal(f.providerLogs[0].status, "SUCCESS");
  assert.equal((f.providerLogs[0].metadata as Record<string, unknown>).requestId, requestId);
  assert.ok(!JSON.stringify([f.histories, f.analytics, f.providerLogs]).includes(f.session!.credential), "never persist a session credential in diagnostics");
});

test("unconsented car searches never invent a visitor identity", async (t) => {
  const f = fixture(t, { consent: false, session: false });
  const response = await f.post();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Kt-Search-Session"), null);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(f.calls(), 0);
  await f.flush();
  assert.equal(f.histories[0].visitorId, null);
  assert.equal(f.histories[0].userId, null);
  assert.equal(f.analytics[0].visitorId, null);
  assert.equal(f.analytics[0].userId, null);
  assert.ok(!Object.hasOwn(f.histories[0].query as object, "operationalSessionId"));
});

test("unavailable car provider records a failed search without affecting the response", async (t) => {
  const f = fixture(t, { status: "unavailable" });
  const response = await f.post();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("X-Kt-Search-Session"), f.session!.credential);
  assert.deepEqual(await response.json(), { results: [], requestId, error: "Car search is temporarily unavailable." });
  assert.equal(f.histories.length, 0);
  assert.equal(f.providerLogs.length, 0);
  await f.flush();
  assert.equal(f.histories[0].status, "FAILED");
  assert.equal(f.histories[0].resultCount, 0);
  assert.equal(f.providerLogs[0].status, "FAILED");
});

test("optional analytics failures do not interrupt a valid car search", async (t) => {
  const f = fixture(t, { failingLog: true });
  const result = await f.post();
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { results: [{ id: "car-offer" }], requestId });
  await assert.doesNotReject(f.flush());
  assert.equal(f.histories.length, 0);
  assert.equal(f.providerLogs.length, 1);
});

test("optional provider diagnostics failures do not interrupt search history or the response", async (t) => {
  const f = fixture(t, { failingProviderLog: true });
  const response = await f.post();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { results: [{ id: "car-offer" }], requestId });
  await assert.doesNotReject(f.flush());
  assert.equal(f.histories.length, 1);
  assert.equal(f.histories[0].status, "SUCCESS");
  assert.equal(f.providerLogs.length, 0);
});
