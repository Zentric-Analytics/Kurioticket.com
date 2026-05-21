"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CircleDollarSign,
  Heart,
  Hotel,
  Plane,
  Sparkles,
} from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SearchTabs } from "@/components/search/SearchTabs";
import { LinkButton } from "@/components/ui/Button";

import {
  getLanguageFromStorage,
  type LanguageCode,
} from "@/lib/language";

const i18n = {
  en: {
    heroTitle: "Find Cheap Flights Fast",
    heroSubtitle:
      "Search hundreds of airlines and travel sites to find the best deals for your next trip.",
    flights: "Flights",
    hotels: "Hotels",
    searchFlights: "Search Flights",
    searchHotels: "Search Hotels",
    from: "From",
    to: "To",
    departure: "Departure",
    return: "Return",
    destination: "Destination",
    checkIn: "Check-in",
    checkOut: "Check-out",
    guests: "Guests",
    rooms: "Rooms",
    cityAirport: "City or airport",
    cityHotelArea: "City or hotel area",
    selectDate: "Select date",
    notNeeded: "Not needed",
    travelersClass: "Travelers & Class",
    oneTraveler: "1 Traveler",
    twoTravelers: "2 Travelers",
    threeTravelers: "3 Travelers",
    fourTravelers: "4 Travelers",
    economy: "Economy",
    premiumEconomy: "Premium economy",
    business: "Business",
    first: "First",
    adults: "Adults",
    room: "Room",
    searchHotelsInstead:
      "Search hotels instead",
  },

  fr: {
    heroTitle:
      "Trouvez des vols pas chers rapidement",
    heroSubtitle:
      "Recherchez des centaines de compagnies aériennes et de sites de voyage pour trouver les meilleures offres.",
    flights: "Vols",
    hotels: "Hôtels",
    searchFlights:
      "Rechercher des vols",
    searchHotels:
      "Rechercher des hôtels",
    from: "Départ",
    to: "Arrivée",
    departure: "Départ",
    return: "Retour",
    destination: "Destination",
    checkIn: "Arrivée",
    checkOut: "Départ",
    guests: "Voyageurs",
    rooms: "Chambres",
    cityAirport:
      "Ville ou aéroport",
    cityHotelArea:
      "Ville ou zone hôtelière",
    selectDate:
      "Choisir une date",
    notNeeded: "Non requis",
    travelersClass:
      "Voyageurs et classe",
    oneTraveler:
      "1 voyageur",
    twoTravelers:
      "2 voyageurs",
    threeTravelers:
      "3 voyageurs",
    fourTravelers:
      "4 voyageurs",
    economy: "Économie",
    premiumEconomy:
      "Éco premium",
    business: "Affaires",
    first: "Première",
    adults: "Adultes",
    room: "Chambre",
    searchHotelsInstead:
      "Rechercher des hôtels",
  },

  es: {
    heroTitle:
      "Encuentra vuelos baratos rápido",
    heroSubtitle:
      "Busca en cientos de aerolíneas y sitios de viaje para encontrar las mejores ofertas.",
    flights: "Vuelos",
    hotels: "Hoteles",
    searchFlights:
      "Buscar vuelos",
    searchHotels:
      "Buscar hoteles",
    from: "Desde",
    to: "Hacia",
    departure: "Salida",
    return: "Regreso",
    destination:
      "Destino",
    checkIn: "Entrada",
    checkOut: "Salida",
    guests: "Huéspedes",
    rooms: "Habitaciones",
    cityAirport:
      "Ciudad o aeropuerto",
    cityHotelArea:
      "Ciudad o zona hotelera",
    selectDate:
      "Selecciona fecha",
    notNeeded:
      "No necesario",
    travelersClass:
      "Viajeros y clase",
    oneTraveler:
      "1 viajero",
    twoTravelers:
      "2 viajeros",
    threeTravelers:
      "3 viajeros",
    fourTravelers:
      "4 viajeros",
    economy: "Económica",
    premiumEconomy:
      "Económica premium",
    business: "Business",
    first: "Primera",
    adults: "Adultos",
    room: "Habitación",
    searchHotelsInstead:
      "Buscar hoteles",
  },

  ar: {
    heroTitle:
      "اعثر على رحلات رخيصة بسرعة",
    heroSubtitle:
      "ابحث بين مئات شركات الطيران ومواقع السفر للعثور على أفضل العروض.",
    flights: "رحلات",
    hotels: "فنادق",
    searchFlights:
      "ابحث عن رحلات",
    searchHotels:
      "ابحث عن فنادق",
    from: "من",
    to: "إلى",
    departure: "المغادرة",
    return: "العودة",
    destination:
      "الوجهة",
    checkIn:
      "تسجيل الوصول",
    checkOut:
      "تسجيل المغادرة",
    guests: "الضيوف",
    rooms: "الغرف",
    cityAirport:
      "مدينة أو مطار",
    cityHotelArea:
      "مدينة أو منطقة فندقية",
    selectDate:
      "اختر التاريخ",
    notNeeded:
      "غير مطلوب",
    travelersClass:
      "المسافرون والدرجة",
    oneTraveler:
      "مسافر 1",
    twoTravelers:
      "مسافران",
    threeTravelers:
      "3 مسافرين",
    fourTravelers:
      "4 مسافرين",
    economy:
      "اقتصادية",
    premiumEconomy:
      "اقتصادية ممتازة",
    business:
      "رجال الأعمال",
    first: "الأولى",
    adults: "بالغون",
    room: "غرفة",
    searchHotelsInstead:
      "ابحث عن فنادق",
  },
} as const;

const heroImage =
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1800&q=85";

const destinations = [
  {
    city: "Dubai",
    country: "UAE",
    price: "$420",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=700&q=80",
  },
  {
    city: "London",
    country: "United Kingdom",
    price: "$380",
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=700&q=80",
  },
  {
    city: "Paris",
    country: "France",
    price: "$410",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=700&q=80",
  },
  {
    city: "Bali",
    country: "Indonesia",
    price: "$370",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=700&q=80",
  },
  {
    city: "New York",
    country: "USA",
    price: "$390",
    image:
      "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=700&q=80",
  },
];

export default function Home() {
  const [language, setLanguage] =
    useState<LanguageCode>(
      getLanguageFromStorage
    );

  useEffect(() => {
    const sync = () =>
      setLanguage(
        getLanguageFromStorage()
      );

    window.addEventListener(
      "curioticket-language-change",
      sync as EventListener
    );

    return () =>
      window.removeEventListener(
        "curioticket-language-change",
        sync as EventListener
      );
  }, []);

  const t = useMemo(
    () => i18n[language],
    [language]
  );

  return (
    <>
      <AppHeader />

      <main className="flex-1 bg-white">
        <section className="relative overflow-visible bg-[#f8f7ff]">
          <div className="absolute inset-0">
            <Image
              src={heroImage}
              alt="Luxury tropical resort"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />

            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.97)_4%,rgba(255,255,255,0.93)_37%,rgba(255,255,255,0.62)_58%,rgba(255,255,255,0.12)_100%)]" />

            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#f8f7ff] via-[#f8f7ff]/75 to-transparent" />
          </div>

          <div className="page-shell relative pb-8 pt-6 sm:pb-10 sm:pt-8 lg:pt-10">
            <div className="grid min-h-[390px] content-start gap-4 pb-5 sm:min-h-[420px] lg:min-h-[450px] lg:max-w-[1000px]">
              <div className="space-y-3 pt-2">
                <p className="inline-flex rounded-full border border-[#d9ccff] bg-white/85 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#5b21d6] backdrop-blur">
                  Trusted travel search platform
                </p>

                <h1 className="max-w-3xl text-4xl font-black leading-[1.03] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  {t.heroTitle}
                </h1>

                <p className="max-w-xl text-base font-semibold leading-7 text-slate-700 sm:text-lg sm:leading-8">
                  {t.heroSubtitle}
                </p>
              </div>

              <div className="relative z-10 mt-2 w-full max-w-[1080px]">
                <div className="rounded-2xl border border-white/85 bg-white/95 p-2 shadow-[0_24px_65px_-35px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:rounded-3xl sm:p-3">
                  <SearchTabs
                    t={
                      t as unknown as Record<
                        string,
                        string
                      >
                    }
                    compactHero
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-950">
              Popular Destinations
            </h2>

            <LinkButton
              href="/hotels/tokyo"
              variant="ghost"
              size="sm"
              className="hidden text-[#6d28d9] sm:inline-flex"
            >
              View all destinations
              <ArrowRight size={16} />
            </LinkButton>
          </div>

          <div className="mt-5 grid gap-4 min-[420px]:grid-cols-2 lg:grid-cols-5">
            {destinations.map(
              (destination) => (
                <DestinationCard
                  key={
                    destination.city
                  }
                  {...destination}
                />
              )
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function DestinationCard({
  city,
  country,
  price,
  image,
}: {
  city: string;
  country: string;
  price: string;
  image: string;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-36">
        <Image
          src={image}
          alt={`${city}, ${country}`}
          fill
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-950/10 to-transparent" />

        <button
          type="button"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur"
        >
          <Heart size={17} />
        </button>

        <div className="absolute bottom-3 left-3 text-white">
          <h3 className="text-xl font-black">
            {city}
          </h3>
          <p className="text-sm font-semibold">
            {country}
          </p>
        </div>
      </div>

      <div className="p-4 text-sm font-bold text-slate-700">
        From{" "}
        <span className="text-lg font-black text-[#6d28d9]">
          {price}
        </span>
      </div>
    </article>
  );
}