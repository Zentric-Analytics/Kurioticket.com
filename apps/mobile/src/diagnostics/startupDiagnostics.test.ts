import { test } from "node:test";
import assert from "node:assert/strict";
import { startupDiagnostic } from "./startupDiagnostics";
import { getMobileHealth, getMobileConfig } from "../api/mobileApi";
import { recordNativeUpdateFailures } from "./nativeUpdateDiagnostics";
test("bounds diagnostic fields and drops arbitrary values", () => {
  assert.deepEqual(startupDiagnostic("secret-url" as never, "private-token" as never, Infinity, 999),
    { boundary: "bootstrap", outcome: "error", elapsedMs: 0 });
});
test("native update diagnostics discard messages, URLs and unknown codes", async () => {
  const previous = console.info;
  const lines: string[] = [];
  console.info = (...args) => lines.push(args.join(" "));
  try {
    await recordNativeUpdateFailures(async () => [
      { code: "UpdateServerUnreachable", message: "private-token" },
      { code: "private-token" }, { code: "InitializationError" },
    ]);
    assert.equal(lines.length, 2);
    assert.match(lines[0], /"boundary":"update-check".*"outcome":"network"/);
    assert.match(lines[1], /"boundary":"update-initialization"/);
    assert.doesNotMatch(lines.join(" "), /private-token|message/);
  } finally { console.info = previous; }
});
test("classifies the actual abort deadline as timeout rather than a network error", async (context) => {
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://staging.kurioticket.com";
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const pending = getMobileHealth((async (_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener("abort", () => reject(new Error("private network text")), { once: true });
  })) as typeof fetch);
  context.mock.timers.tick(8000);
  const result = await pending;
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "timeout");
});
test("separates HTTP, parsing, schema and network bootstrap failures without error text", async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://staging.kurioticket.com";
  const recorded: string[] = [];
  const previous = console.info;
  console.info = (...args) => recorded.push(args.join(" "));
  try {
    for (const [expected, fetcher] of [
      ["http", async () => new Response("private", { status: 503 })],
      ["parse", async () => new Response("not json private")],
      ["schema", async () => Response.json({ private: "private" })],
      ["network", async () => { throw new Error("private secret-bearing-url"); }],
    ] as const) {
      const result = await getMobileHealth(fetcher as typeof fetch);
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.error.code, expected);
      assert.equal(recorded.some(line => line.includes('"outcome":"' + expected + '"')), true);
    }
    await getMobileConfig((async () => Response.json({})) as typeof fetch);
    assert.match(recorded.at(-1)!, /"boundary":"config"/);
    assert.doesNotMatch(recorded.join(" "), /private|secret-bearing/);
  } finally { console.info = previous; }
});
