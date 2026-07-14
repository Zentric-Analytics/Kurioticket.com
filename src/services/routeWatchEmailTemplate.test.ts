import assert from "node:assert/strict";
import test from "node:test";

import { htmlToText } from "@/services/emailDeliveryService";
import { routeWatchUpdateEmail } from "@/services/emailService";

test("route watch email renders required content, escapes dynamic values, and avoids guarantee language", () => {
  const html = routeWatchUpdateEmail({
    name: "Ada <script>",
    origin: "JFK",
    destination: "LHR",
    departureDate: "2026-08-20",
    returnDate: "2026-08-27",
    previousPrice: "$500.00",
    currentPrice: "$400.00",
    decreasePercent: "20% lower",
    currency: "USD",
    ctaUrl: "https://kurioticket.com/flights/results?origin=JFK&destination=LHR",
    preferencesUrl: "https://kurioticket.com/dashboard/preferences/email",
  });
  assert.match(html, /A lower fare is available for a route you’re watching/);
  assert.match(html, /JFK/);
  assert.match(html, /LHR/);
  assert.match(html, /2026-08-20/);
  assert.match(html, /2026-08-27/);
  assert.match(html, /\$500\.00/);
  assert.match(html, /\$400\.00/);
  assert.match(html, /20% lower/);
  assert.match(html, /Compare current options/);
  assert.match(html, /Manage email preferences/);
  assert.match(html, /Fares and availability may change/);
  assert.match(html, /Ada &lt;script&gt;/);
  assert.doesNotMatch(html, /guaranteed fare|reserved price|booked price|Kurioticket airline|guaranteed availability/i);
  assert.match(htmlToText(html), /Compare current options/);
});
