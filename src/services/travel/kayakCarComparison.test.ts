import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { groupKayakCarResults as sharedCarGrouping } from "@/lib/cars/carResults";
import { normalizeSandboxOffers } from "./kayakSandbox";
import { groupKayakCarResults, scopeKayakOfferIds } from "./kayakMetasearchProvider";
import { kayakCarCardModel } from "@/components/results/kayakCardModels";
import { getCarDealPickerGroups, filterCarResults, sortCarOffers } from "@/lib/cars/carResults";
import { capturedKayakCars } from "./fixtures/kayakCarsCaptured";
import { formatCarSupplierFacts } from "@/lib/cars/supplierFacts";

test("browser-loaded and server KAYAK cars use the same complete grouping", () => {
  assert.equal(groupKayakCarResults, sharedCarGrouping);
  const client = readFileSync("src/components/results/CarsResultsClient.tsx", "utf8");
  assert.match(client, /groupKayakCarResults\(kayak\.offers\.map\(offer => kayakCarCardModel/);
  assert.doesNotMatch(client, /\.\.\.kayak\.offers\.map/);
  const offers = normalizeSandboxOffers("cars", capturedKayakCars);
  const groups = sharedCarGrouping(offers.map(offer => kayakCarCardModel(offer, 3, "LAX")));
  assert.equal(groups.length, 1);
  assert.equal(groups[0].offers.length, 7);
});

const option = (seller: string, price: number) => ({
  providerCode: seller, agencyCode: "agency", pickupLocationId: "pickup", dropoffLocationId: "dropoff",
  bookingUrl: "https://affiliates.kayak.com/sandbox-clickout", price: { price },
  car: { brand: "Test car", type: { displayName: "SUV" }, doors: "doors45", passengers: 5, bags: 3 },
  fees: [{ code: "securityDeposit", rate: { price: 100, displayPrice: "$100" }, isIncludedInTotal: false }],
  isCreditCardRequired: true, paymentType: "payAtPickup",
});
const response = {
  currency: "USD", priceMode: "perDayTotal", days: 3,
  providers: { A: { displayName: "Seller A", logoUrls: { horizontalUrl: "https://content.r9cdn.net/a.png" } }, B: { displayName: "Seller B" } },
  agencies: { agency: { displayName: "Rental agency", type: "regular" } },
  carLocations: { pickup: { address: "Pickup street" }, dropoff: { address: "Return street" } },
  results: [
    { id: "group-1", bookingOptions: [option("A", 30), option("B", 25), option("A", 40)] },
    { id: "group-2", bookingOptions: [option("A", 20)] },
  ],
};

test("customer fact formatting decodes door ranges without mutating supplier facts", () => {
  const facts = [{ label: "doors", value: "doors45" }, { label: "payment Type", value: "payAtPickup" }, { label: "unknown", value: "future-enum" }];
  assert.deepEqual(formatCarSupplierFacts(facts)?.map(fact => fact.value), ["4 or 5 doors", "Pay at pickup", "future-enum"]);
  assert.equal(facts[0].value, "doors45");
});

test("actual LAX sandbox response replays as one car with all seven rates from five sellers", () => {
  const normalized = normalizeSandboxOffers("cars", capturedKayakCars);
  const cars = groupKayakCarResults(scopeKayakOfferIds(normalized, "actual").map(offer => kayakCarCardModel(offer, 99, "LAX")));
  assert.equal(cars.length, 1);
  const [car] = cars;
  assert.equal(car.offers.length, 7);
  assert.equal(new Set(car.offers.map(offer => offer.bookingProviderName)).size, 5);
  assert.deepEqual(car.offers.map(offer => offer.totalPrice), [210, 1693, 1695, 1695, 1700, 1700, 1700]);
  assert.equal(getCarDealPickerGroups(car).length, 7);
  assert.equal(sortCarOffers(car.offers).length, 7);
  const details = readFileSync("src/components/results/CarDetailsClient.tsx", "utf8");
  assert.match(details, /car\.inventorySource === "kayak-sandbox" \? sortCarOffers\(car\.offers\) : getComparisonCarOffers\(car\.offers\)/);
  for (const [index, raw] of capturedKayakCars.results[0].bookingOptions.entries()) {
    const offer = car.offers.find(item => item.id.endsWith(`:${index}`))!;
    assert.equal(offer.totalPrice, raw.price.price);
    assert.equal(offer.pricePerDay, raw.price.price / capturedKayakCars.days);
    assert.equal(offer.bookingProviderName, capturedKayakCars.providers[raw.providerCode].displayName);
    assert.equal(offer.bookingUrl, raw.bookingUrl);
    assert.equal(offer.payAtPickup, raw.paymentType === "payAtPickup");
    const cancellation = (raw.policy as { cancellation?: { isUnlimited?: boolean } }).cancellation;
    assert.equal(offer.freeCancellation, cancellation?.isUnlimited === true || (raw.badges?.some(badge => badge.code === "freeCancellation") ?? false));
    assert.ok(offer.suppliedFacts?.some(fact => fact.label === "is Credit Card Required" && fact.value === (raw.isCreditCardRequired ? "Yes" : "No")));
    assert.ok(offer.suppliedFacts?.some(fact => fact.label === "payment Type" && fact.value === raw.paymentType));
    assert.ok(offer.suppliedFacts?.some(fact => fact.label === "bags" && fact.value === String(raw.car.bags)));
  }
});

test("grouped actual rates filter per offer, not the cheapest car or a union of incompatible facts", () => {
  const cars = groupKayakCarResults(scopeKayakOfferIds(normalizeSandboxOffers("cars", capturedKayakCars), "actual").map(offer => kayakCarCardModel(offer, 3, "LAX")));
  const filtered = filterCarResults(cars, { seats: ["seats5Plus"], bags: ["bags3Plus"] });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].offers.length, 3);
  assert.equal(filtered[0].offers[0].totalPrice, 1695);
  assert.ok(filtered[0].sandboxPresentation?.specs.includes("5 passengers"));
  assert.equal(filterCarResults(cars, { seats: ["seats5Plus"], price: ["daily50To99"] }).length, 0);
  assert.equal(cars[0].offers.length, 7);
  const pickupRates = filterCarResults(cars, { payment: ["payAtPickup"], mileage: ["unlimitedMileage"], location: ["shuttlePickup"] });
  assert.equal(pickupRates[0].offers.length, 2);
  assert.ok(pickupRates[0].offers.every(offer => offer.suppliedFacts?.some(fact => fact.label === "payment Type" && fact.value === "payAtPickup")));
});

test("KAYAK groups retain every valid rate, including same-seller options, without merging matching car names", () => {
  const offers = scopeKayakOfferIds(normalizeSandboxOffers("cars", response), "snapshot");
  const cars = groupKayakCarResults(offers.map(offer => kayakCarCardModel(offer, 1, "LAX"))).sort((a, b) => a.id.localeCompare(b.id));
  assert.equal(cars.length, 2);
  assert.equal(cars[0].id, "kayak-sandbox:snapshot:group-1");
  assert.deepEqual(cars[0].offers.map(offer => offer.totalPrice), [75, 90, 120]);
  assert.equal(getCarDealPickerGroups(cars[0]).length, 3);
  assert.equal(cars[1].offers.length, 1);
  assert.equal(new Set(cars.flatMap(car => car.offers.map(offer => offer.id))).size, 4);
});

test("customer facts retain fees, card requirement, both locations and documented provider logo", () => {
  const [offer] = normalizeSandboxOffers("cars", response);
  assert.equal(offer.bookingProviderLogoUrl, "https://content.r9cdn.net/a.png");
  assert.ok(offer.carSpecs?.includes("4 or 5 doors"));
  const facts = offer.attributes!;
  assert.ok(facts.some(fact => fact.label.includes("fees") && fact.value === "securityDeposit"));
  assert.ok(facts.some(fact => fact.label === "is Credit Card Required" && fact.value === "Yes"));
  assert.ok(facts.some(fact => fact.label === "Pickup · address" && fact.value === "Pickup street"));
  assert.ok(facts.some(fact => fact.label === "Drop-off · address" && fact.value === "Return street"));
  assert.ok(!JSON.stringify(facts).includes("https://"));
});

test("invalid options are excluded without losing valid siblings or inventing additional sellers", () => {
  const data = structuredClone(response);
  data.results[0].bookingOptions[0].price.price = -1;
  data.results[0].bookingOptions[1].bookingUrl = "https://untrusted.example/";
  const cars = groupKayakCarResults(scopeKayakOfferIds(normalizeSandboxOffers("cars", data), "s").map(offer => kayakCarCardModel(offer, 3, "LAX")));
  assert.equal(cars[0].offers.length, 1);
  assert.equal(cars[0].offers[0].bookingProviderName, "Seller A");
});
