import type { HomeDiscoveryItem } from "@/data/homeDiscovery";

export function buildDiscoveryLink(item: HomeDiscoveryItem) {
  const departureDate = new Date();
  departureDate.setDate(departureDate.getDate() + 30);

  return {
    pathname: "/flights/results",
    query: {
      tripType: "one-way",
      origin: item.originCode,
      destination: item.destinationCode,
      departureDate: departureDate.toISOString().slice(0, 10),
      adults: "1",
      children: "0",
      infants: "0",
      travelers: "1",
      cabinClass: "economy",
    },
  };
}
