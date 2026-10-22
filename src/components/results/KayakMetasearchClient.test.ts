import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("src/components/results/KayakMetasearchClient.tsx", "utf8");
const compiled = ts.transpileModule(source.replace(/^import .*;\r?$/gm, "").replace("export function", "function"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText;
function harness(vertical = "flights") {
  const effects: (() => () => void)[] = [];
  const microtasks: (() => void)[] = [];
  const writes: unknown[] = [];
  let count = 0;
  let signal: AbortSignal | undefined;
  let payload: unknown;
  let finish!: (response: Response) => void;
  let retry!: (destinationId?: string) => Promise<void>;
  runInNewContext(`${compiled}\nKayakMetasearchClient({ vertical: "${vertical}", criteria: { origin: "BOS" } });`, {
    AbortController, Intl, queueMicrotask: (fn: () => void) => microtasks.push(fn),
    useRef: (current: unknown) => ({ current }), useCallback: (fn: typeof retry) => { retry = fn; return fn; },
    useMemo: (fn: () => unknown) => fn(),
    useEffect: (fn: () => () => void) => effects.push(fn),
    useState: (initial: unknown) => [initial, (value: unknown) => writes.push(value)],
    React: { createElement: () => null },
    KayakResultsContext: { Provider: "provider" },
    fetch: (_url: string, options: { signal: AbortSignal; body: string }) => {
      count++; signal = options.signal; payload = JSON.parse(options.body);
      return new Promise<Response>(resolve => { finish = resolve; });
    },
  });
  return { effects, microtasks, writes, count: () => count, signal: () => signal, payload: () => payload,
    retry: () => retry(),
    respond: async (body: unknown, status = 200) => { finish(Response.json(body, { status })); await new Promise(resolve => setImmediate(resolve)); },
    finish: async (ok: boolean) => { finish(Response.json(ok ? { results: [] } : { error: "Provider unavailable" }, { status: ok ? 200 : 502 })); await new Promise(resolve => setImmediate(resolve)); } };
}
test("normal search automatically requests KAYAK without an extra button click", async () => {
  const view = harness(); view.effects[0](); view.microtasks.shift()!();
  assert.equal(view.count(), 1);
  assert.deepEqual(view.payload(), { action: "regular-search", vertical: "flights", criteria: { origin: "BOS" } });
  await view.finish(true);
  assert.ok(view.writes.includes("No KAYAK test offers for this search. Other provider results are unaffected."));
});

test("each vertical can retry after failure without overlapping or automatic retry loops", async () => {
  for (const vertical of ["flights", "hotels", "cars"]) {
    const view = harness(vertical); view.effects[0](); view.microtasks.shift()!();
    await view.retry();
    assert.equal(view.count(), 1, "busy retry must not send another request");
    await view.respond({ error: "KAYAK search did not finish. Please retry." }, 504);
    assert.equal(view.count(), 1, "failure must not automatically consume more quota");
    const retry = view.retry();
    assert.equal(view.count(), 2);
    await view.respond({ results: [] }); await retry;
    assert.ok(view.writes.includes("No KAYAK test offers for this search. Other provider results are unaffected."));
    assert.equal(view.writes.at(-1), false);
  }
});
test("strict effect replay cancels the discarded mount before starting a request", async () => {
  const view = harness(); view.effects[0]()(); const cleanup = view.effects[0]();
  view.microtasks.forEach(fn => fn());
  assert.equal(view.count(), 1);
  cleanup(); const before = view.writes.length;
  assert.equal(view.signal()?.aborted, true);
  await view.finish(true); assert.equal(view.writes.length, before);
});
test("provider failure is contained in its own result section", async () => {
  const view = harness(); view.effects[0](); view.microtasks.shift()!();
  await view.finish(false);
  assert.ok(view.writes.includes("Provider unavailable"));
  assert.equal(view.writes.at(-1), false);
});

test("malformed success never replaces the shared offer list with invalid data", async () => {
  for (const body of [{}, { results: null }, { results: {} }]) {
    const view = harness(); view.effects[0](); view.microtasks.shift()!();
    await view.respond(body);
    assert.ok(view.writes.every(value => value !== undefined && value !== null));
    assert.ok(view.writes.includes("KAYAK is unavailable. Other provider results are unaffected. You can retry KAYAK below."));
    assert.equal(view.writes.at(-1), false);
  }
});
