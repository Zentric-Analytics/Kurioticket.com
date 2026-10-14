import type { CarOffer } from "./types";

/** Presentation only: preserve stored provider facts and unknown enum values. */
export function formatCarSupplierFacts(facts: CarOffer["suppliedFacts"]): CarOffer["suppliedFacts"] {
  const values: Record<string, string> = {
    prepay: "Pay now", payAtPickup: "Pay at pickup", deposit: "Deposit payment",
    bestAvailable: "Best available", fullToFull: "Full to full", sameToSame: "Same to same",
    inTerminal: "In terminal", shuttle: "Shuttle", nonAirport: "Non-airport",
    callForPickup: "Call for pickup", checkForDetails: "Check with supplier", opaqueAirport: "Airport location disclosed by supplier",
    youngDriver: "Young-driver fee", seniorDriver: "Senior-driver fee", dropOff: "Drop-off fee",
    afterHours: "After-hours fee", deliveryFee: "Delivery fee", securityDeposit: "Security deposit",
    freeCancellation: "Free cancellation", ac: "Air conditioning", p2p: "Peer-to-peer",
  };
  return facts?.map(fact => ({
    label: fact.label.split(" · ").map(part => {
      const label = part === "is Credit Card Required" ? "Credit card required" : part === "sipp" ? "SIPP vehicle code" : part;
      return label.charAt(0).toUpperCase() + label.slice(1);
    }).join(" · "),
    value: fact.label === "doors" && /^doors\d+$/.test(fact.value)
      ? `${fact.value.slice(5).split("").join(" or ")} doors`
      : /(?:^| · )(?:code|payment Type|rate Type|location Type|type)$/.test(fact.label)
        ? values[fact.value] ?? fact.value : fact.value,
  }));
}
