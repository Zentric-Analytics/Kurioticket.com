import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("src/components/results/KayakSandboxResults.tsx", "utf8");
const compiled = ts.transpileModule(source.replace(/^import .*;\r?$/gm, "").replace("export function", "function"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText;

function harness() {
  const writes: unknown[] = [];
  let cleanup: (() => void) | undefined;
  let run: (() => Promise<void>) | undefined;
  let requests = 0;
  let signal: AbortSignal | undefined;
  let finish!: (value: { ok: boolean; json(): Promise<unknown> }) => void;
  const response = new Promise<{ ok: boolean; json(): Promise<unknown> }>((resolve) => { finish = resolve; });
  runInNewContext(`${compiled}\nKayakSandboxResults({ search: { departure: "2026-10-12" } });`, {
    AbortController, Intl,
    useRef: (current: unknown) => ({ current }),
    useEffect: (effect: () => (() => void)) => { cleanup = effect(); },
    useState: (initial: unknown) => [initial, (value: unknown) => writes.push(value)],
    React: { createElement: (tag: string, props: { onClick?: () => Promise<void> } | null) => {
      if (tag === "button") run = props?.onClick;
      return null;
    } },
    fetch: (_url: string, options: { signal: AbortSignal }) => {
      requests++; signal = options.signal; return response;
    },
  });
  assert.ok(run);
  return { run, writes, cleanup: () => cleanup?.(), requests: () => requests,
    signal: () => signal, finish: (results: unknown[]) => finish({ ok: true, json: async () => ({ results }) }) };
}

test("sandbox results suppress overlapping searches and complete a normal response", async () => {
  const view = harness();
  const first = view.run();
  await view.run();
  assert.equal(view.requests(), 1);
  view.finish([]);
  await first;
  assert.equal(view.writes.at(-1), false);
  assert.ok(view.writes.includes("No test results found."));
});

test("leaving a sandbox search aborts the request and ignores a late response", async () => {
  const view = harness();
  const request = view.run();
  const before = view.writes.length;
  view.cleanup();
  assert.equal(view.signal()?.aborted, true);
  view.finish([]);
  await request;
  assert.equal(view.writes.length, before);
});

test("changed flight criteria remount the sandbox results instead of keeping old offers", () => {
  const route = readFileSync("src/app/flights/results/page.tsx", "utf8");
  assert.match(route, /<KayakSandboxResults key=\{JSON\.stringify\(adapted\.search\)\} search=\{adapted\.search\}/);
});
