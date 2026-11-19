import source from "./fixtures/kayak-fare-information.json";
import { normalizeSandboxOffers } from "../../src/services/travel/kayakSandbox";
import { kayakFlightCardModel } from "../../src/components/results/kayakCardModels";
import { buildProviderAwareFlightDetails } from "../../src/services/travel/standaloneFlightDetails";

async function richResponse() {
  const data = structuredClone(source);
  Object.assign(data.providers, { OTHER: { displayName: "Alternate seller" } });
  const second = structuredClone(data.results[0].bookingOptions[0]);
  second.providerCode = "OTHER"; second.displayPrice.price = 318; second.fees.totalPrice = 318; second.fees.basePrice = 211;
  data.results[0].bookingOptions.push(second);
  const offers = normalizeSandboxOffers("flights", data).map(offer => kayakFlightCardModel(offer)!);
  const result = await buildProviderAwareFlightDetails({ cachedSelected: offers[0], cachedAlternatives: offers, now: 1,
    search: { tripType: "one-way", origin: "BOS", destination: "LAS", departureDate: "2027-02-10", adults: 1, children: 0, infants: 0, travelers: 1, cabinClass: "economy" } });
  if (result.status !== "available") throw new Error("Expected available fixture");
  process.stdout.write(JSON.stringify(result));
}

await richResponse();
