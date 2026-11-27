import assert from "node:assert/strict";
import test from "node:test";
import { matchRenderBotLog, type RenderBotCandidate } from "./renderBotEvidence";

const service = "srv-test";
const row: RenderBotCandidate = {
  id: "activity", environment: "staging", renderRequestId: "0f3b5741-3b94-4f4a",
  timestamp: new Date("2026-11-27T11:13:26.445Z"), method: "GET", endpoint: "/:restricted",
  declaredName: "GOOGLEBOT", responseStatus: 403,
};
const message = 'clientIP="8.8.8.8" requestID="0f3b5741-3b94-4f4a" responseTimeMS=12 responseBytes=277 userAgent="Googlebot/2.1"';
const fixture = {
  timestamp: "2026-11-27T11:13:26.452445128Z", message,
  labels: Object.entries({ resource: service, type: "request", host: "staging.kurioticket.com",
    method: "GET", statusCode: "403", path: "/flights/details/private-id?secret=discard" }).map(([name, value]) => ({ name, value })),
};
function label(name: string, value: string) {
  return { ...fixture, labels: fixture.labels.map(item => item.name === name ? { name, value } : item) };
}
test("recovers only a public Render request's matching IP and timestamp, not request-time verification", () => {
  assert.deepEqual(matchRenderBotLog(row, [fixture], service), {
    ip: "8.8.8.8", timestamp: new Date("2026-11-27T11:13:26.452Z"),
  });
  assert.equal(matchRenderBotLog({ ...row, endpoint: "/cars/results" }, [label("path", "/cars/results?token=discard")], service)?.ip, "8.8.8.8");
  const unknown = { ...row, declaredName: null };
  assert.equal(matchRenderBotLog(unknown, [{ ...fixture, message: message.replace("Googlebot/2.1", "python-requests/2.0") }], service)?.ip, "8.8.8.8");
});
test("ambiguous, unmatched or invalid records cannot be reconciled", () => {
  for (const logs of [
    [], [fixture, fixture], [fixture, { ...fixture, message: message.replace(/userAgent=.*/, "malformed") }],
    [label("resource", "srv-other")], [label("type", "app")], [label("host", "other.example")],
    [label("method", "POST")], [label("statusCode", "200")], [label("path", "/cars/results")],
    [label("path", "//other.example/a")], [{ ...fixture, timestamp: "2026-11-27T11:14:00Z" }],
    [{ ...fixture, timestamp: "2026-11-27T11:13:25Z" }], [{ ...fixture, timestamp: "invalid" }],
    [{ ...fixture, message: message.replace("8.8.8.8", "10.0.0.1") }],
    [{ ...fixture, message: message.replace("8.8.8.8", "2a06:98c0:3600::103") }],
    [{ ...fixture, message: message.replace("Googlebot/2.1", "Bingbot") }],
    [{ ...fixture, message: message.replace("0f3b5741-3b94-4f4a", "other-request") +
      ' requestID="0f3b5741-3b94-4f4a"' }],
  ]) assert.equal(matchRenderBotLog(row, logs, service), null);
  assert.equal(matchRenderBotLog({ ...row, environment: "production" }, [fixture], service), null);
  assert.equal(matchRenderBotLog({ ...row, renderRequestId: null }, [fixture], service), null);
});
