import assert from "node:assert/strict";
import test from "node:test";
import { kayakRejectionDiagnostics } from "./kayakRejectionDiagnostics";
import { KayakError, KayakSandboxClient } from "./kayakSandbox";

const path = "/i/api/affiliate/search/car/v1/poll";
test("rejection diagnostics retain fixed evidence without response text or request credentials", async () => {
  const diagnostic = await kayakRejectionDiagnostics(new Response("<title>Access Denied</title> private-key private-ip", {
    status: 403, headers: { "content-type": "text/html", server: "AkamaiGHost" },
  }), path, "POST", "okhttp/4.12.0");
  assert.deepEqual(diagnostic, { endpoint: "car_poll", method: "POST", httpStatus: 403, agentKind: "android_transport", contentType: "html", serverKind: "akamai", evidenceTerms: ["denied"], evidence: "access_denied_page" });
  assert.doesNotMatch(JSON.stringify(diagnostic), /private|okhttp|https|apiKey/);
  const unknown = await kayakRejectionDiagnostics(new Response('{"detail":"arbitrary secret text"}', { status: 403, headers: { "content-type": "application/json", "cf-ray": "unsafe private value" } }), path, "POST", "Mozilla/5.0");
  assert.equal(unknown.evidence, "unspecified");
  assert.equal("edgeRequestId" in unknown, false);
  const compact = await kayakRejectionDiagnostics(new Response('{"error":"userAgent is invalid","private":"private-value"}', { status: 403 }), path, "POST", "okhttp/4.12.0");
  assert.equal(compact.evidence, "explicit_user_agent_rejection");
  assert.deepEqual(compact.evidenceTerms, ["user_agent", "invalid"]);
  assert.doesNotMatch(JSON.stringify(compact), /private/);
});
test("only explicit provider statements establish a rejection hint", async () => {
  for (const [body, expected] of [["Unsupported User-Agent", "explicit_user_agent_rejection"], ["invalid api key", "explicit_api_key_rejection"], ["Forbidden", "unspecified"]]) {
    assert.equal((await kayakRejectionDiagnostics(new Response(body, { status: 403 }), path, "POST", "okhttp/4.12.0")).evidence, expected);
  }
});
test("diagnostic read is byte and time bounded", async () => {
  const oversized = new Response(" ".repeat(8192) + "Invalid API key", { status: 403 });
  assert.equal((await kayakRejectionDiagnostics(oversized, path, "POST", "x")).evidence, "unspecified");
  let cancelled = false;
  const stalled = new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status: 403 });
  await kayakRejectionDiagnostics(stalled, path, "POST", "x");
  assert.equal(cancelled, true);
});
test("403 stays failed without retry or client-header mutation even if diagnostic sink throws", async () => {
  let calls = 0;
  const client = new KayakSandboxClient("test-key", (async (_url, init) => {
    calls++;
    assert.equal(new Headers(init?.headers).get("User-Agent"), "okhttp/4.12.0");
    assert.equal(new Headers(init?.headers).get("x-original-client-ip"), "203.0.113.4");
    return new Response("Forbidden", { status: 403 });
  }) as typeof fetch, async () => assert.fail("must not retry denial"), "okhttp/4.12.0", "203.0.113.4", () => {}, () => { throw new Error("sink failure"); });
  await assert.rejects(client.search({ vertical: "cars", origin: "LHR", departure: "2027-12-14", returnDate: "2027-12-17", pickupTime: "10:00", dropoffTime: "10:00" }, "test-track"), error => error instanceof KayakError && error.httpStatus === 403);
  assert.equal(calls, 1);
});
