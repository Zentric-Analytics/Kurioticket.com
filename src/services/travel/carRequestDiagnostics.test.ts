import assert from "node:assert/strict";
import test from "node:test";
import { carRequestDiagnostics } from "./carRequestDiagnostics";
import { KayakSandboxClient } from "./kayakSandbox";

test("outbound comparison isolates payload, IP and real client identity without logging them", () => {
  const native = carRequestDiagnostics('{"private":"criteria"}', "okhttp/4.12.0", "203.0.113.9");
  const app = carRequestDiagnostics('{"private":"criteria"}', "KurioticketMobile/0.3.0 (Android; Native) OkHttp", "203.0.113.9");
  assert.equal(native.payloadFingerprint, app.payloadFingerprint);
  assert.equal(native.clientIpFingerprint, app.clientIpFingerprint);
  assert.notEqual(native.agentFingerprint, app.agentFingerprint);
  assert.equal(app.agentKind, "android_application");
  assert.equal(app.nativeTransportDisclosed, true);
  assert.notEqual(carRequestDiagnostics("different", "okhttp/4.12.0", "203.0.113.9").payloadFingerprint, native.payloadFingerprint);
  assert.doesNotMatch(JSON.stringify(native), /private|criteria|203\.0|4\.12\.0/);
});
test("initial trace fingerprints exactly the bytes sent upstream and diagnostic sink cannot affect failure", async () => {
  let wireBody = "";
  let trace: ReturnType<typeof carRequestDiagnostics> | undefined;
  const agent = "KurioticketMobile/0.3.0 (Android; Native) OkHttp";
  const client = new KayakSandboxClient("test-key", (async (_url, init) => {
    wireBody = String(init?.body);
    assert.equal(new Headers(init?.headers).get("User-Agent"), agent);
    return new Response("Forbidden", { status: 403 });
  }) as typeof fetch, async () => {}, agent, "203.0.113.9", () => {}, () => {}, diagnostic => { trace = diagnostic; throw new Error("sink unavailable"); });
  await assert.rejects(client.search({ vertical: "cars", origin: "LHR", departure: "2027-12-14", returnDate: "2027-12-17", pickupTime: "10:00", dropoffTime: "10:00" }, "test-track"));
  assert.equal(trace?.payloadFingerprint, carRequestDiagnostics(wireBody, agent, "203.0.113.9").payloadFingerprint);
  assert.doesNotMatch(JSON.stringify(trace), /test-key|test-track|2027|LHR/);
});
