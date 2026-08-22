import assert from "node:assert/strict";
import test from "node:test";
import { flightShareMessage, shareFlightForAuthenticatedSession } from "./flightDetailInteractions";

test("flight share copy contains useful public flight details and no private offer data", () => {
  const result = {
    airlineName: "Example Air",
    originAirport: "JFK",
    destinationAirport: "LAX",
    departureTime: "2027-08-20T14:30:00Z",
    id: "private-id",
    partnerRedirectUrl: "https://provider.example/token=secret",
  };
  const message = flightShareMessage(result, "$420");
  assert.match(message, /JFK → LAX/);
  assert.match(message, /Example Air/);
  assert.match(message, /Departs/);
  assert.match(message, /Fare \$420/);
  assert.doesNotMatch(message, /private-id|provider\.example|token|secret/);
});

test("flight share copy omits an unavailable displayed fare", () => {
  assert.doesNotMatch(flightShareMessage({ airlineName: "Air", originAirport: "JFK", destinationAirport: "LAX", departureTime: "invalid" }, "—"), /Fare|invalid/);
});

test("an authenticated session invokes the native share callback with the prepared message", async () => {
  const messages: string[] = [];
  const outcome = await shareFlightForAuthenticatedSession({
    readSession: async () => ({ token: "registered-session" }),
    share: async (message) => { messages.push(message); },
    message: "JFK → LAX · Example Air",
  });
  assert.equal(outcome, "shared");
  assert.deepEqual(messages, ["JFK → LAX · Example Air"]);
});

for (const [name, readSession] of [
  ["no session", async () => null],
  ["expired session", async () => null],
  ["session-read failure", async () => { throw new Error("secure storage unavailable"); }],
] as const) {
  test(`${name} requires sign-in without invoking share`, async () => {
    let shared = false;
    const outcome = await shareFlightForAuthenticatedSession({
      readSession,
      share: async () => { shared = true; },
      message: "public flight copy",
    });
    assert.equal(outcome, "sign-in-required");
    assert.equal(shared, false);
  });
}
