export type CarImageCard = {
  translationKey: string;
  pickupLocation: string;
  image: string;
  ctaKey?: string;
  vehicleType?: string;
};

export type CarPickupCard = Omit<CarImageCard, "vehicleType">;

export const tripStyleCards: CarImageCard[] = [
  {
    translationKey: "carsTripStyle.economy",
    pickupLocation: "City center",
    vehicleType: "economy",
    ctaKey: "carsTripStyle.economy.cta",
    image:
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80",
  },
  {
    translationKey: "carsTripStyle.suv",
    pickupLocation: "Airport",
    vehicleType: "suv",
    ctaKey: "carsTripStyle.suv.cta",
    image:
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
  },
  {
    translationKey: "carsTripStyle.luxury",
    pickupLocation: "Hotel area",
    vehicleType: "luxury",
    ctaKey: "carsTripStyle.luxury.cta",
    image:
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    translationKey: "carsTripStyle.van",
    pickupLocation: "Airport",
    vehicleType: "van",
    ctaKey: "carsTripStyle.van.cta",
    image:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
  },
];

export const pickupCards: CarPickupCard[] = [
  {
    translationKey: "carsPickup.Airport",
    pickupLocation: "Airport",
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
  },
  {
    translationKey: "carsPickup.City center",
    pickupLocation: "City center",
    image:
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80",
  },
  {
    translationKey: "carsPickup.Train station",
    pickupLocation: "Train station",
    image:
      "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    translationKey: "carsPickup.Hotel area",
    pickupLocation: "Hotel area",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
  },
];

export const carsFaqItems = [
  {
    id: "search-information",
    questionKey: "carsFaq.0.question",
    answerKey: "carsFaq.0.answer",
  },
  {
    id: "different-return-location",
    questionKey: "carsFaq.1.question",
    answerKey: "carsFaq.1.answer",
  },
  {
    id: "driver-age",
    questionKey: "carsFaq.2.question",
    answerKey: "carsFaq.2.answer",
  },
  {
    id: "before-booking",
    questionKey: "carsFaq.3.question",
    answerKey: "carsFaq.3.answer",
  },
  {
    id: "final-price",
    questionKey: "carsFaq.4.question",
    answerKey: "carsFaq.4.answer",
  },
  {
    id: "pickup-documents",
    questionKey: "carsFaq.5.question",
    answerKey: "carsFaq.5.answer",
  },
];
