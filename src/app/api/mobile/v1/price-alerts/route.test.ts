import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { signInHref } from "../../../../../../apps/mobile/src/features/auth/signInIntent";

const route = readFileSync("src/app/api/mobile/v1/price-alerts/route.ts", "utf8");
const validation = readFileSync("src/lib/validation.ts", "utf8");
const service = readFileSync("src/services/priceTrackingService.ts", "utf8");
const nativeCarAlert = readFileSync("apps/mobile/src/features/search/NativeCarPriceAlert.tsx", "utf8");
const carQuery = { pickupLocation: "Everett", dropoffLocation: "Everett", pickupDate: "2030-01-01", pickupTime: "10:00", dropoffDate: "2030-01-03", dropoffTime: "10:00", driverAge: "18-70" };

type SearchPlan = { key: string; summary: string; payload: Record<string, unknown> };
type OfferScope = { resultId: string; offerId: string; providerName: string };
type AlertPayload = { type: "CAR"; origin: string; destination: string; mode: "AUTOMATIC"; baselinePrice: number; currency: string; query: typeof carQuery & { offer?: OfferScope } };
type MobilePriceAlert = { id: string; type: "CAR" | "HOTEL"; mode: "AUTOMATIC" | "TARGET"; status: "ACTIVE" | "PAUSED"; origin: string; destination: string; currency: string; targetPrice: string | null; createdAt: string; updatedAt: string; lastSeenPrice: null; lastCheckedAt: null; query: Record<string, unknown> };

const plan: SearchPlan = { key: "car:selected", summary: "Selected rental", payload: carQuery };
const selectedOffer = { id: "offer-selected", bookingProviderName: " Selected Seller ", rentalCompanyName: "Rental Company", totalPrice: 486, currency: "USD" };
const selectedScope = { resultId: "result-selected", offerId: selectedOffer.id, providerName: "Selected Seller" };
const component = ts.createSourceFile("NativeCarPriceAlert.tsx", nativeCarAlert, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const nativeFunction = component.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "NativeCarPriceAlert");
assert.ok(nativeFunction && ts.isFunctionDeclaration(nativeFunction) && nativeFunction.body);
const nativeBody = nativeFunction.body;

function nativeExpression(name: string) {
  const declaration = nativeBody.statements.find((node) => ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => ts.isIdentifier(item.name) && item.name.text === name));
  assert.ok(declaration && ts.isVariableStatement(declaration), `native declaration: ${name}`);
  const value = declaration.declarationList.declarations.find((item) => ts.isIdentifier(item.name) && item.name.text === name)?.initializer;
  assert.ok(value, `native expression: ${name}`);
  return value.getText(component);
}

function evaluateNative<T>(source: string, bindings: Record<string, unknown>): T {
  const exports: { value?: T } = {};
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports, ...bindings });
  assert.ok(exports.value);
  return exports.value;
}

// Evaluate the real native model through its sole data dependency. Importing its
// API types would also pull React Native ambient timer types into the web build.
const currencies = evaluateNative<{ supportedCurrencies: Array<{ code: string }> }>(`${readFileSync("apps/mobile/src/config/supportedCurrencies.ts", "utf8")}; exports.value = exports;`, {});
const { buildAutomaticCarPriceAlertPayload, matchingCarPriceAlert } = evaluateNative<{
  buildAutomaticCarPriceAlertPayload: (plan: SearchPlan, baseline: number, currency: string, scope?: OfferScope) => AlertPayload;
  matchingCarPriceAlert: (alerts: MobilePriceAlert[], plan: SearchPlan, scope?: OfferScope) => MobilePriceAlert | undefined;
}>(`${readFileSync("apps/mobile/src/features/flow/carPriceAlertModel.ts", "utf8")}; exports.value = exports;`, {
  require: (name: string) => { assert.equal(name, "../../config/supportedCurrencies", "unexpected native model dependency"); return currencies; },
});

// Load the actual error class without importing the API's storage/network graph.
const apiSource = ts.createSourceFile("travelApi.ts", readFileSync("apps/mobile/src/api/travelApi.ts", "utf8"), ts.ScriptTarget.Latest, true);
const errorClass = apiSource.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === "TravelApiError");
assert.ok(errorClass);
const NativeApiError = evaluateNative<new (message: string, status: number) => Error>(`${errorClass.getText(apiSource)}; exports.value = TravelApiError;`, {});

function fixtureAlert(status: "ACTIVE" | "PAUSED", scope = selectedScope): MobilePriceAlert {
  return { id: "canonical-selected", type: "CAR", mode: "AUTOMATIC", status, origin: "Everett", destination: "Everett", currency: "USD", targetPrice: null, createdAt: "", updatedAt: "", lastSeenPrice: null, lastCheckedAt: null, query: buildAutomaticCarPriceAlertPayload(plan, 486, "USD", scope).query };
}

type NativeFixtureOptions = {
  matching?: MobilePriceAlert;
  listed?: MobilePriceAlert[];
  createError?: Error;
  updateError?: Error;
  listError?: Error;
  session?: boolean;
  available?: boolean;
  alertKnown?: boolean;
  createWait?: Promise<void>;
  offer?: typeof selectedOffer;
};

function nativeFixture(options: NativeFixtureOptions = {}) {
  const payloads: ReturnType<typeof buildAutomaticCarPriceAlertPayload>[] = [];
  const updates: Array<{ id: string; status: "ACTIVE" | "PAUSED" }> = [];
  const adopted: Array<MobilePriceAlert | undefined> = [];
  const feedback: string[] = [];
  const reconciled: string[] = [];
  const navigation: Array<ReturnType<typeof signInHref>> = [];
  const dialogs: Array<{ title: string; message: string; buttons: Array<{ text: string; onPress?: () => void }> }> = [];
  let lists = 0;
  const pendingRef = { current: false };
  const state = { pending: false, optimistic: null as boolean | null };
  const hooks = { useMemo: (fn: () => unknown) => fn(), useCallback: (fn: unknown) => fn };
  const offer = options.offer ?? selectedOffer;
  const scope = evaluateNative<typeof selectedScope>(`exports.value = ${nativeExpression("scope")};`, { ...hooks, resultId: selectedScope.resultId, offer });
  const baseline = evaluateNative<typeof selectedOffer>(`exports.value = ${nativeExpression("baseline")};`, { plan, offer });
  const scopeKey = evaluateNative<string>(`exports.value = ${nativeExpression("scopeKey")};`, { planKey: plan.key, scope });
  const bindings = {
    ...hooks, plan, baseline, scope, scopeKey, matchingAlert: options.matching,
    pendingRef, reconciliationRef: { current: 0 }, alertKnown: options.alertKnown ?? true, available: options.available ?? true,
    buildAutomaticCarPriceAlertPayload, matchingCarPriceAlert, TravelApiError: NativeApiError, signInHref,
    readSession: async () => options.session === false ? null : { fixture: true },
    Alert: { alert: (title: string, message: string, buttons: Array<{ text: string; onPress?: () => void }>) => dialogs.push({ title, message, buttons }) },
    router: { push: (href: ReturnType<typeof signInHref>) => navigation.push(href) },
    onFeedback: (value: string) => feedback.push(value),
    setCurrentMatchingAlert: (value: MobilePriceAlert | undefined) => adopted.push(value),
    setReconciledPlanKey: (value: string) => reconciled.push(value),
    setPending: (value: boolean) => { state.pending = value; },
    setOptimisticTracking: (value: boolean | null) => { state.optimistic = value; },
    travelApi: {
      createPriceAlert: async (payload: ReturnType<typeof buildAutomaticCarPriceAlertPayload>) => {
        payloads.push(payload);
        if (options.createWait) await options.createWait;
        if (options.createError) throw options.createError;
        return { alert: { ...fixtureAlert("ACTIVE"), id: "created-selected" } };
      },
      priceAlerts: async () => { lists += 1; if (options.listError) throw options.listError; return { alerts: options.listed ?? [] }; },
      updatePriceAlertStatus: async (id: string, status: "ACTIVE" | "PAUSED") => {
        updates.push({ id, status });
        if (options.updateError) throw options.updateError;
        const current = options.listed?.find((item) => item.id === id) ?? options.matching;
        assert.ok(current, "only an existing fixture alert can be modified");
        return { alert: { ...current, status } };
      },
    },
  };
  // Execute the real toggle and feedback/auth helpers, not a copied state machine.
  const toggle = evaluateNative<(next: boolean) => Promise<void>>(`exports.value = (() => {
    const showFeedback = ${nativeExpression("showFeedback")};
    const signIn = ${nativeExpression("signIn")};
    const showFailure = ${nativeExpression("showFailure")};
    const toggle = ${nativeExpression("toggle")};
    return toggle;
  })();`, bindings);
  return { toggle, payloads, updates, adopted, feedback, reconciled, navigation, dialogs, state, pendingRef, get lists() { return lists; } };
}

function assertClean(fixture: ReturnType<typeof nativeFixture>) {
  assert.equal(fixture.pendingRef.current, false);
  assert.equal(fixture.state.pending, false);
  assert.equal(fixture.state.optimistic, null);
}

test("native Cars conflict reactivation network failure shows retry without false success", async () => {
  const options: NativeFixtureOptions = { createError: new NativeApiError("Conflict", 409), listed: [fixtureAlert("PAUSED")], updateError: new Error("Offline") };
  const fixture = nativeFixture(options);
  await assert.doesNotReject(fixture.toggle(true));
  assert.deepEqual(fixture.updates, [{ id: "canonical-selected", status: "ACTIVE" }]);
  assert.equal(fixture.dialogs.length, 1);
  assert.equal(fixture.dialogs[0].title, "Couldn’t turn on price tracking");
  assert.deepEqual(Array.from(fixture.dialogs[0].buttons, ({ text }) => text), ["Cancel", "Try again"]);
  assert.equal(typeof fixture.dialogs[0].buttons[1].onPress, "function");
  assert.deepEqual(fixture.feedback, []);
  assert.deepEqual(fixture.adopted, []);
  assertClean(fixture);
  options.updateError = undefined;
  fixture.dialogs[0].buttons[1].onPress?.();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(fixture.updates.length, 2, "explicit retry targets the canonical alert again");
  assert.deepEqual(fixture.feedback, ["active"]);
  assertClean(fixture);
});

test("native Cars conflict reactivation 401 uses established sign-in and clears pending state", async () => {
  const fixture = nativeFixture({ createError: new NativeApiError("Conflict", 409), listed: [fixtureAlert("PAUSED")], updateError: new NativeApiError("Expired session", 401) });
  await assert.doesNotReject(fixture.toggle(true));
  assert.equal(fixture.dialogs.length, 1);
  assert.equal(fixture.dialogs[0].title, "Sign in required");
  fixture.dialogs[0].buttons.find(({ text }) => text === "Sign in")?.onPress?.();
  assert.deepEqual(fixture.navigation, [signInHref("/(tabs)/profile")]);
  assert.deepEqual(fixture.adopted, [undefined]);
  assert.deepEqual(fixture.feedback, []);
  assertClean(fixture);
});

test("mobile price-alert creation accepts Cars through the shared validated service path", () => {
  assert.match(route, /\["FLIGHT", "HOTEL", "CAR"\]\.includes/);
  assert.match(route, /priceAlertSchema\.safeParse\(payload\)/);
  assert.match(route, /createPriceAlert\(\{ userId: session\.user\.id, \.\.\.parsed\.data \}\)/);
  assert.match(validation, /const carPriceAlertSchema = z\.object/);
  assert.match(validation, /priceAlertSchema = z\.discriminatedUnion\("type", \[[\s\S]*carPriceAlertSchema/);
  assert.match(service, /type: "FLIGHT" \| "HOTEL" \| "CAR"/);
});

test("Cars API accepts automatic baseline creation without weakening target creation", async () => {
  const { priceAlertSchema } = await import("@/lib/validation");
  const common = { type: "CAR" as const, origin: "Everett", destination: "Everett", currency: "USD", query: carQuery };
  const automatic = priceAlertSchema.safeParse({ ...common, mode: "AUTOMATIC", baselinePrice: 486 });
  assert.equal(automatic.success, true);
  if (automatic.success) { assert.equal(automatic.data.mode, "AUTOMATIC"); assert.equal((automatic.data as { targetPrice?: unknown }).targetPrice, undefined); }
  assert.equal(priceAlertSchema.safeParse({ ...common, mode: "AUTOMATIC" }).success, false);
  assert.equal(priceAlertSchema.safeParse({ ...common, mode: "TARGET", targetPrice: 450 }).success, true);
  assert.equal(priceAlertSchema.safeParse({ ...common, mode: "TARGET" }).success, false);
});

test("native Cars price-alert success path creates automatic tracking and can pause or reactivate", async () => {
  const created = nativeFixture();
  await created.toggle(true);
  assert.deepEqual(JSON.parse(JSON.stringify(created.payloads)), [{
    type: "CAR", origin: "Everett", destination: "Everett", mode: "AUTOMATIC", baselinePrice: 486, currency: "USD", query: { ...carQuery, offer: selectedScope },
  }]);
  assert.deepEqual(created.adopted.map((alert) => [alert?.id, alert?.status]), [["created-selected", "ACTIVE"]]);
  assert.deepEqual(created.feedback, ["active"]);
  assert.equal(created.dialogs.length, 0);
  assertClean(created);

  const fallback = nativeFixture({ offer: { ...selectedOffer, bookingProviderName: " ", rentalCompanyName: " Fallback Rental ", totalPrice: 725, currency: " eur " } });
  await fallback.toggle(true);
  assert.equal(fallback.payloads[0].baselinePrice, 725);
  assert.equal(fallback.payloads[0].currency, "EUR");
  assert.equal(fallback.payloads[0].query.offer?.providerName, "Fallback Rental");
  assertClean(fallback);

  for (const next of [false, true]) {
    const current = fixtureAlert(next ? "PAUSED" : "ACTIVE");
    const fixture = nativeFixture({ matching: current });
    await fixture.toggle(next);
    assert.deepEqual(fixture.updates, [{ id: current.id, status: next ? "ACTIVE" : "PAUSED" }]);
    assert.equal(fixture.payloads.length, 0);
    assert.deepEqual(fixture.feedback, [next ? "active" : "paused"]);
    assertClean(fixture);
  }

  const unrelated = fixtureAlert("ACTIVE", { ...selectedScope, offerId: "other-offer" });
  for (const status of ["ACTIVE", "PAUSED"] as const) {
    const canonical = fixtureAlert(status);
    const fixture = nativeFixture({ createError: new NativeApiError("Conflict", 409), listed: [unrelated, canonical] });
    await fixture.toggle(true);
    assert.equal(fixture.lists, 1);
    assert.deepEqual(fixture.updates, status === "PAUSED" ? [{ id: canonical.id, status: "ACTIVE" }] : []);
    assert.equal(fixture.adopted[0]?.id, canonical.id);
    assert.deepEqual(fixture.feedback, ["active"]);
    assertClean(fixture);
  }

  const foreignAlerts: MobilePriceAlert[] = [
    ...(["resultId", "offerId", "providerName"] as const).map((field) => fixtureAlert("PAUSED", { ...selectedScope, [field]: `other-${field}` })),
    { ...fixtureAlert("ACTIVE"), query: { ...carQuery, pickupTime: "11:00", offer: selectedScope } },
    { ...fixtureAlert("ACTIVE"), query: { ...carQuery } },
    { ...fixtureAlert("ACTIVE"), mode: "TARGET", targetPrice: "450" },
    { ...fixtureAlert("ACTIVE"), type: "HOTEL" },
  ];
  for (const foreign of foreignAlerts) {
    const fixture = nativeFixture({ createError: new NativeApiError("Conflict", 409), listed: [foreign] });
    await fixture.toggle(true);
    assert.deepEqual(fixture.updates, [], "do not modify an unrelated canonical alert");
    assert.deepEqual(fixture.adopted, [], "do not adopt another result/offer/provider/plan/type/mode");
    assert.deepEqual(fixture.feedback, []);
    assert.equal(fixture.dialogs[0]?.title, "Couldn’t turn on price tracking");
    assertClean(fixture);
  }

  for (const fixture of [
    nativeFixture({ session: false }),
    nativeFixture({ createError: new NativeApiError("Unauthorized", 401) }),
    nativeFixture({ createError: new NativeApiError("Conflict", 409), listError: new NativeApiError("Expired", 401) }),
  ]) {
    await fixture.toggle(true);
    assert.equal(fixture.dialogs[0]?.title, "Sign in required");
    assert.deepEqual(fixture.feedback, []);
    assert.deepEqual(fixture.updates, []);
    assertClean(fixture);
  }

  for (const fixture of [
    nativeFixture({ createError: new Error("Offline") }),
    nativeFixture({ createError: new NativeApiError("Conflict", 409), listError: new Error("Offline") }),
  ]) {
    await assert.doesNotReject(fixture.toggle(true));
    assert.equal(fixture.dialogs[0]?.title, "Couldn’t turn on price tracking");
    assert.deepEqual(fixture.feedback, []);
    assertClean(fixture);
  }
  const failedPause = nativeFixture({ matching: fixtureAlert("ACTIVE"), updateError: new Error("Offline") });
  await failedPause.toggle(false);
  assert.equal(failedPause.dialogs[0]?.title, "Couldn’t turn off price tracking");
  assert.deepEqual(failedPause.feedback, []);
  assert.deepEqual(failedPause.adopted, []);
  assertClean(failedPause);
  for (const next of [false, true]) {
    const fixture = nativeFixture({ matching: fixtureAlert(next ? "PAUSED" : "ACTIVE"), updateError: new NativeApiError("Expired", 401) });
    await fixture.toggle(next);
    assert.equal(fixture.dialogs[0]?.title, "Sign in required");
    assert.deepEqual(fixture.adopted, [undefined]);
    assert.deepEqual(fixture.feedback, []);
    assertClean(fixture);
  }

  let release!: () => void;
  const duplicate = nativeFixture({ createWait: new Promise<void>((resolve) => { release = resolve; }) });
  const first = duplicate.toggle(true);
  const second = duplicate.toggle(true);
  await new Promise<void>((resolve) => setImmediate(resolve));
  const pendingCreates = duplicate.payloads.length;
  assert.equal(duplicate.state.pending, true);
  assert.equal(duplicate.state.optimistic, true);
  release();
  await Promise.all([first, second]);
  assert.equal(pendingCreates, 1);
  assert.deepEqual(duplicate.feedback, ["active"]);
  assertClean(duplicate);

  for (const [options, next] of [
    [{ matching: fixtureAlert("ACTIVE") }, true],
    [{ matching: fixtureAlert("PAUSED") }, false],
    [{ available: false }, true],
    [{ alertKnown: false }, true],
  ] as const) {
    const fixture = nativeFixture(options);
    await fixture.toggle(next);
    assert.equal(fixture.payloads.length, 0);
    assert.deepEqual(fixture.updates, []);
    assertClean(fixture);
  }
});
