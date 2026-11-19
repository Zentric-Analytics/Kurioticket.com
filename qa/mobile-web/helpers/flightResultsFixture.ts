/** Deterministic inventory large enough to exercise window virtualization. */
export const flightResultsDate = "2030-11-18";
export const flightResultsPath = `/flights/results?tripType=one-way&origin=SFO&destination=LOS&departureDate=${flightResultsDate}&adults=1&children=0&infants=0&travelers=1&cabinClass=economy&sort=cheapest`;
export const flightResultsFixture = Array.from({ length: 120 }, (_, index) => ({
  id: `flight-${index}`, provider: "QA Fixture", airlineName: `Fixture Air ${index}`, airlineCode: "QA",
  originAirport: "SFO", destinationAirport: "LOS", departureTime: `${flightResultsDate}T08:00:00Z`, arrivalTime: `${flightResultsDate}T20:00:00Z`,
  duration: "12h", durationMinutes: 720, stops: 0, layovers: [], cabinClass: "economy", baggageInfo: "Carry-on included",
  refundInfo: "Changes permitted", price: 100 + index, currency: "USD", bookingUrl: "", partnerRedirectUrl: "",
  valueScore: 80, riskScore: 5, comfortScore: 80, travelConfidenceScore: 80, travelEffortScore: 15, recommendationReasons: [], badges: [],
  legs: [{ direction: "outbound", originAirport: "SFO", destinationAirport: "LOS", departureTime: `${flightResultsDate}T08:00:00Z`,
    arrivalTime: `${flightResultsDate}T20:00:00Z`, duration: "12h", durationMinutes: 720, stops: 0, layovers: [], segments: [] }],
  searchPolicy: { source: "duffel", bookable: true, action: { kind: "internal-detail", href: `/flights/details/flight-${index}`, enabled: true } },
}));
