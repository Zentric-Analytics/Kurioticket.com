import assert from "node:assert/strict";
import test from "node:test";
import { flightShareMessage } from "./flightDetailInteractions";

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
