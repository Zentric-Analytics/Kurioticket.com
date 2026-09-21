"use client";
import { FlightCard } from "./FlightCard";
import { HotelCard } from "./HotelCard";
import { CarResultCard } from "./CarResultCard";
import { kayakFlightCardModel, kayakHotelCardModel, kayakCarCardModel } from "./kayakCardModels";
import type { SandboxOffer, KayakVertical } from "@/services/travel/kayakSandbox";
import { saveKayakOffer } from "./kayakOfferStorage";

export function KayakResultCard({offer,vertical,criteria}:{offer:SandboxOffer;vertical:KayakVertical;criteria:Record<string,string>}) {
  const start=criteria.checkIn || criteria.pickupDate || criteria.departureDate;
  const end=criteria.checkOut || criteria.dropoffDate || criteria.returnDate;
  const days=Math.max(1,Math.ceil((Date.parse(end)-Date.parse(start))/86400000)||1);
  const flight=vertical === "flights" ? kayakFlightCardModel(offer, criteria) : null;
  const detailsHref=`/sandbox/kayak/details?id=${encodeURIComponent(offer.id)}`;
  const preserve=()=>saveKayakOffer(sessionStorage,{offer,vertical,criteria});
  return <div className="min-w-0" onClickCapture={preserve}>
    {flight ? <FlightCard flight={flight} detailsHref={detailsHref} actionLabel="View flight" providerLabel="KAYAK sandbox · Simulated · Not bookable" />
      : vertical === "hotels" ? <HotelCard hotel={kayakHotelCardModel(offer,days)} detailsHref={detailsHref} allowSave={false} actionLabel="View hotel" unavailableActionLabel="View hotel" providerLabel="KAYAK sandbox · Not bookable" />
      : vertical === "cars" ? <CarResultCard car={kayakCarCardModel(offer,days,criteria.pickupLocation || "Not supplied")}
        detailsHref={detailsHref} actionLabel="View car" providerLabel="KAYAK sandbox · Not bookable" search={{pickupLocation:criteria.pickupLocation||"",dropoffLocation:criteria.dropoffLocation||criteria.pickupLocation||"",pickupDate:start,pickupTime:criteria.pickupTime||"",dropoffDate:end,dropoffTime:criteria.dropoffTime||"",driverAge:criteria.driverAge||""}} />
      : <p>Flight summary unavailable. Supplied itinerary details are below.</p>}
  </div>;
}
