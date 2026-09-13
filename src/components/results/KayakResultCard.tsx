"use client";
import { FlightCard } from "./FlightCard";
import { HotelCard } from "./HotelCard";
import { CarResultCard } from "./CarResultCard";
import { kayakFlightCardModel, kayakHotelCardModel, kayakCarCardModel } from "./kayakCardModels";
import type { SandboxOffer, KayakVertical } from "@/services/travel/kayakSandbox";

export function KayakResultCard({offer,vertical,criteria}:{offer:SandboxOffer;vertical:KayakVertical;criteria:Record<string,string>}) {
  const start=criteria.checkIn || criteria.pickupDate || criteria.departureDate;
  const end=criteria.checkOut || criteria.dropoffDate || criteria.returnDate;
  const days=Math.max(1,Math.ceil((Date.parse(end)-Date.parse(start))/86400000)||1);
  const flight=vertical === "flights" ? kayakFlightCardModel(offer, criteria) : null;
  return <div className="min-w-0 space-y-2">
    <p className="text-xs font-semibold text-amber-800">KAYAK sandbox · Simulated · {flight ? "Total for all travelers" : offer.priceBasis} · Not bookable</p>
    {flight ? <FlightCard flight={flight} detailsHref={null} actionLabel="Sandbox only" />
      : vertical === "hotels" ? <HotelCard hotel={kayakHotelCardModel(offer,days)} detailsHref={null} allowSave={false} actionLabel="Sandbox only" unavailableActionLabel="Sandbox only" />
      : vertical === "cars" ? <CarResultCard car={kayakCarCardModel(offer,days,criteria.pickupLocation || "Not supplied")}
        detailsHref={null} actionLabel="Sandbox only" search={{pickupLocation:criteria.pickupLocation||"",dropoffLocation:criteria.dropoffLocation||criteria.pickupLocation||"",pickupDate:start,pickupTime:criteria.pickupTime||"",dropoffDate:end,dropoffTime:criteria.dropoffTime||"",driverAge:criteria.driverAge||""}} />
      : <p>Flight summary unavailable. Supplied itinerary details are below.</p>}
    <details className="rounded-xl border border-slate-200 bg-white p-3">
      <summary className="cursor-pointer font-semibold text-[#004BB8]">View all supplied details and test link</summary>
      <p className="mt-3">{offer.description}</p>
      <p>Original provider price: {offer.price} {offer.currency} · {offer.priceBasis}</p>
      <ul>{offer.details.map((detail,index)=><li key={index}>{detail}</li>)}</ul>
      {offer.flightLegs?.flatMap(leg=>leg.segments).filter(segment=>segment.operatingDisclosure).map((segment,index)=><p key={index}>{segment.operatingDisclosure}</p>)}
      <dl className="my-3 grid gap-2 sm:grid-cols-2">{offer.attributes?.map((attribute,index)=><div key={index}><dt className="font-medium capitalize">{attribute.label}</dt><dd className="break-words">{attribute.value}</dd></div>)}</dl>
      <a href={offer.testUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="inline-block rounded-md bg-[#004BB8] px-4 py-2 text-white">Open KAYAK test page</a>
    </details>
  </div>;
}
