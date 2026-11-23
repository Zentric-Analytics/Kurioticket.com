/** Actual sandbox response sample: LAX, 2026-11-18 10:00 to 2026-11-21 10:00.
 * Captured 2026-10-14T14:08:37.948Z, complete, 488 total provider groups.
 * Retains the first group's seven options. Booking URLs were replaced with the
 * approved inert sandbox landing URL; no credentials or search tokens retained.
 * Repeated response structures below are factored for readability, not invented.
 */
const car = (bags: number, passengers: number) => ({
  image: "https://content.r9cdn.net/rimg/affiliate/sandbox.png",
  type: { code: "special", displayName: "Supplier choice" }, brand: "Class Special Car",
  bags, passengers, doors: "doors4", transmission: "automatic", fuel: "petrol", sipp: "XXAR",
  features: [{ code: "ac", displayName: "Air conditioning" }],
});
const fuel = { code: "fullToFull", displayName: "full-to-full", description: "Pick up and drop off the car with a full tank" };
const mileage = { code: "unlimited" };
const freeCancellation = [{ code: "freeCancellation", displayName: "Free Cancellation" }];
const option = (providerCode: string, price: number, bags: number, passengers: number, isCreditCardRequired: boolean, paymentType: string, policy: object, badges?: typeof freeCancellation) => ({
  providerCode, agencyCode: "priceless", bookingUrl: "https://affiliates.kayak.com/sandbox-clickout",
  policy, isCreditCardRequired, car: car(bags, passengers), price: { price, displayPrice: `$${price}.0` },
  pickupLocationId: "20074989", paymentType, rateType: "bestAvailable", ...(badges ? { badges } : {}),
});
export const capturedKayakCars = {
  currency: "USD", priceMode: "total", days: 3, status: "complete", totalCount: 488,
  results: [{ id: "3f6b548556a225c6f876b3b8c558040d", bookingOptions: [
    option("IPRICELINECARAFFILIATE", 1700, 3, 5, true, "prepay", { cancellation: { isUnlimited: false, limitHours: 48, nonCancellationFee: { price: 44, displayPrice: "$44.0" } }, mileage, fuel }, freeCancellation),
    option("IPRICELESS", 1700, 0, 4, false, "prepay", { mileage }),
    option("IAIRPORTRENTALCARS", 1700, 3, 5, true, "prepay", { mileage, fuel }),
    option("IEXPEDIACARAPI", 1693, 2, 4, true, "prepay", { mileage, fuel }),
    option("IPRICELESS", 1695, 0, 4, false, "payAtPickup", { mileage }),
    option("IAIRPORTRENTALCARS", 1695, 3, 5, false, "payAtPickup", { cancellation: { isUnlimited: true, nonCancellationFee: { price: 44, displayPrice: "$44.0" } }, mileage, fuel }, freeCancellation),
    option("IBOOKINGGROUP", 210, 1, 4, false, "prepay", { cancellation: { isUnlimited: false, limitHours: 48, nonCancellationFee: { price: 12, displayPrice: "$12.0" } }, mileage, fuel }, freeCancellation),
  ] }],
  providers: Object.fromEntries([
    ["IPRICELINECARAFFILIATE", "Priceline"], ["IPRICELESS", "Priceless"],
    ["IAIRPORTRENTALCARS", "AirportRentalCars"], ["IEXPEDIACARAPI", "Expedia"], ["IBOOKINGGROUP", "EconomyBookings"],
  ].map(([code, displayName]) => [code, { code, displayName, logoUrls: { horizontalUrl: "https://content.r9cdn.net/rimg/affiliate/sandbox.png" } }])),
  agencies: { priceless: { code: "priceless", displayName: "Priceless", type: "regular", logoUrls: { horizontalUrl: "https://content.r9cdn.net/rimg/affiliate/sandbox.png" } } },
  carLocations: { "20074989": {
    locationId: "20074989", coordinates: { latitude: 33.9429372288584, longitude: -118.41034329101564 },
    displayDistance: "1.5 mi", airport: { code: "LAX", displayName: "Los Angeles" },
    address: "9750 Airport Boulevard", locationType: "shuttle", cityName: "Los Angeles", countryCode: "US",
  } },
};
