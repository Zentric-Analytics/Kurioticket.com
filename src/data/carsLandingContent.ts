export type CarImageCard = {
  title: string;
  subtitle: string;
  pickupLocation: string;
  image: string;
  imageAlt: string;
  ariaLabel: string;
  cta?: string;
  vehicleType?: string;
};

export type CarPickupCard = Omit<CarImageCard, "ariaLabel" | "vehicleType">;

export const tripStyleCards: CarImageCard[] = [
  {
    title: "Economy cars",
    subtitle: "Affordable city and solo-trip searches",
    pickupLocation: "City center",
    vehicleType: "economy",
    cta: "Start an economy car search",
    image:
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Compact city cars traveling between downtown buildings",
    ariaLabel: "Start an economy car search from City center pickup",
  },
  {
    title: "SUVs",
    subtitle: "Room for family trips, luggage, and longer drives",
    pickupLocation: "Airport",
    vehicleType: "suv",
    cta: "Open SUV rental search",
    image:
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "SUV driving along an open road near mountains",
    ariaLabel: "Open SUV rental search from Airport pickup",
  },
  {
    title: "Luxury cars",
    subtitle: "Premium search context for business or special trips",
    pickupLocation: "Hotel area",
    vehicleType: "luxury",
    cta: "Plan a luxury car search",
    image:
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Premium car parked near an elegant modern building",
    ariaLabel: "Plan a luxury car search from Hotel area pickup",
  },
  {
    title: "Vans",
    subtitle: "Search context for group travel and family luggage",
    pickupLocation: "Airport",
    vehicleType: "van",
    cta: "Search vans for group trips",
    image:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Passenger van traveling through a bright scenic road",
    ariaLabel: "Search vans for group trips from Airport pickup",
  },
];

export const pickupCards: CarPickupCard[] = [
  {
    title: "Airport pickups",
    subtitle: "Start from major airport arrival points",
    pickupLocation: "Airport",
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Airplane parked at an airport gate at sunset",
  },
  {
    title: "City center pickups",
    subtitle: "Pick up near downtown hotels and business districts",
    pickupLocation: "City center",
    image:
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Cars driving through a city street between tall buildings",
  },
  {
    title: "Train station pickups",
    subtitle: "Continue your trip after rail arrivals",
    pickupLocation: "Train station",
    image:
      "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Train platform with tracks leading into a city station",
  },
  {
    title: "Hotel area pickups",
    subtitle: "Plan a car pickup near where you are staying",
    pickupLocation: "Hotel area",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Hotel exterior with palm trees and a driveway",
  },
];

export const carsFaqItems = [
  {
    question: "What information do I need to search for a rental car?",
    answer:
      "Enter your pickup location, pickup and return dates, pickup and return times, driver age, and whether you plan to return the car to a different location.",
  },
  {
    question: "Can I return the car to a different location?",
    answer:
      "Yes. Select Different return location in the search form and enter the drop-off city, airport, or address where you plan to return the car.",
  },
  {
    question: "Why does driver age matter for rental cars?",
    answer:
      "Rental providers may apply different rules, fees, vehicle eligibility, or deposit requirements based on the driver’s age and location.",
  },
  {
    question: "What should I check before booking a rental car?",
    answer:
      "Review the pickup and return location, dates, times, mileage policy, fuel policy, insurance options, cancellation terms, deposit requirements, and required documents before booking.",
  },
  {
    question: "Where is the final rental price confirmed?",
    answer:
      "Final price, vehicle availability, taxes, fees, deposit requirements, and rental rules are confirmed by the provider before booking.",
  },
  {
    question: "What documents might I need at pickup?",
    answer:
      "Rental providers may require a valid driver’s license, payment card, proof of identity, and any documents required by the pickup country or location.",
  },
];
