export const searchFields = [
  { label: "From", value: "San Francisco", helper: "SFO" },
  { label: "To", value: "Where to?", helper: "Choose destination" },
  { label: "Departure Date", value: "Aug 12", helper: "Wednesday" },
  { label: "Return Date", value: "Aug 19", helper: "Wednesday" },
  { label: "Passengers & Cabin", value: "1 Adult", helper: "Economy" },
] as const;

export const popularDestinations = [
  { city: "London", price: "$459", accent: "#DCEBFF" },
  { city: "Paris", price: "$429", accent: "#FFE8D6" },
  { city: "Dubai", price: "$589", accent: "#E9F8F6" },
  { city: "New York", price: "$199", accent: "#F0E9FF" },
] as const;
