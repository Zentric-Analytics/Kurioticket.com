type DiscoveryLinkItem = {
  originCode: string;
  destinationCode: string;
};

export function buildDiscoveryLink(item: DiscoveryLinkItem) {
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
