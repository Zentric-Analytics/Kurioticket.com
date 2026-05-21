"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  CircleDollarSign,
  CreditCard,
  Globe2,
  Headphones,
  Heart,
  Hotel,
  Plane,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TicketCheck,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SearchTabs } from "@/components/search/SearchTabs";
import { getLanguageFromStorage, type LanguageCode } from "@/lib/language";
import { LinkButton } from "@/components/ui/Button";


const i18n = {
  en: { heroTitle: "Find Cheap Flights Fast", heroSubtitle: "Search hundreds of airlines and travel sites to find the best deals for your next trip.", assurances: ["Best Prices Guaranteed", "Easy Provider Comparison", "Secure Payments", "24/7 Customer Support"], flights: "Flights", hotels: "Hotels", searchFlights: "Search Flights", searchHotels: "Search Hotels", from: "From", to: "To", departure: "Departure", return: "Return", destination: "Destination", checkIn: "Check-in", checkOut: "Check-out", guests: "Guests", rooms: "Rooms", cityAirport: "City or airport", cityHotelArea: "City or hotel area", selectDate: "Select date", notNeeded: "Not needed", travelersClass: "Travelers & Class", oneTraveler: "1 Traveler", twoTravelers: "2 Travelers", threeTravelers: "3 Travelers", fourTravelers: "4 Travelers", economy: "Economy", premiumEconomy: "Premium economy", business: "Business", first: "First", adults: "Adults", room: "Room", searchHotelsInstead: "Search hotels instead" },
  fr: { heroTitle: "Trouvez des vols pas chers rapidement", heroSubtitle: "Recherchez des centaines de compagnies aériennes et de sites de voyage pour trouver les meilleures offres.", assurances: ["Meilleurs prix garantis", "Comparaison facile", "Paiements sécurisés", "Assistance 24h/24"], flights: "Vols", hotels: "Hôtels", searchFlights: "Rechercher des vols", searchHotels: "Rechercher des hôtels", from: "Départ", to: "Arrivée", departure: "Départ", return: "Retour", destination: "Destination", checkIn: "Arrivée", checkOut: "Départ", guests: "Voyageurs", rooms: "Chambres", cityAirport: "Ville ou aéroport", cityHotelArea: "Ville ou zone hôtelière", selectDate: "Choisir une date", notNeeded: "Non requis", travelersClass: "Voyageurs et classe", oneTraveler: "1 voyageur", twoTravelers: "2 voyageurs", threeTravelers: "3 voyageurs", fourTravelers: "4 voyageurs", economy: "Économie", premiumEconomy: "Éco premium", business: "Affaires", first: "Première", adults: "Adultes", room: "Chambre", searchHotelsInstead: "Rechercher des hôtels" },
  es: { heroTitle: "Encuentra vuelos baratos rápido", heroSubtitle: "Busca en cientos de aerolíneas y sitios de viaje para encontrar las mejores ofertas.", assurances: ["Mejores precios garantizados", "Comparación fácil", "Pagos seguros", "Soporte 24/7"], flights: "Vuelos", hotels: "Hoteles", searchFlights: "Buscar vuelos", searchHotels: "Buscar hoteles", from: "Desde", to: "Hacia", departure: "Salida", return: "Regreso", destination: "Destino", checkIn: "Entrada", checkOut: "Salida", guests: "Huéspedes", rooms: "Habitaciones", cityAirport: "Ciudad o aeropuerto", cityHotelArea: "Ciudad o zona hotelera", selectDate: "Selecciona fecha", notNeeded: "No necesario", travelersClass: "Viajeros y clase", oneTraveler: "1 viajero", twoTravelers: "2 viajeros", threeTravelers: "3 viajeros", fourTravelers: "4 viajeros", economy: "Económica", premiumEconomy: "Económica premium", business: "Business", first: "Primera", adults: "Adultos", room: "Habitación", searchHotelsInstead: "Buscar hoteles" },
  ar: { heroTitle: "اعثر على رحلات رخيصة بسرعة", heroSubtitle: "ابحث بين مئات شركات الطيران ومواقع السفر للعثور على أفضل العروض.", assurances: ["أفضل الأسعار مضمونة", "مقارنة سهلة", "مدفوعات آمنة", "دعم 24/7"], flights: "رحلات", hotels: "فنادق", searchFlights: "ابحث عن رحلات", searchHotels: "ابحث عن فنادق", from: "من", to: "إلى", departure: "المغادرة", return: "العودة", destination: "الوجهة", checkIn: "تسجيل الوصول", checkOut: "تسجيل المغادرة", guests: "الضيوف", rooms: "الغرف", cityAirport: "مدينة أو مطار", cityHotelArea: "مدينة أو منطقة فندقية", selectDate: "اختر التاريخ", notNeeded: "غير مطلوب", travelersClass: "المسافرون والدرجة", oneTraveler: "مسافر 1", twoTravelers: "مسافران", threeTravelers: "3 مسافرين", fourTravelers: "4 مسافرين", economy: "اقتصادية", premiumEconomy: "اقتصادية ممتازة", business: "رجال الأعمال", first: "الأولى", adults: "بالغون", room: "غرفة", searchHotelsInstead: "ابحث عن فنادق" }
} as const;

const heroImage =
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1800&q=85";

const assurances = [
  { label: "Best Prices Guaranteed", icon: ShieldCheck },
  { label: "Easy Provider Comparison", icon: TicketCheck },
  { label: "Secure Payments", icon: CreditCard },
  { label: "24/7 Customer Support", icon: Headphones },
];

const trustItems = [
  { title: "Millions of Choices", body: "Flights and hotels worldwide", icon: Globe2 },
  { title: "Flexible Options", body: "Choose what fits your trip", icon: SlidersHorizontal },
  { title: "Secure Payments", body: "100% safe and secure", icon: CreditCard },
  { title: "Great Deals", body: "Compare more before you buy", icon: BadgeDollarSign },
];

const destinations = [
  {
    city: "Dubai",
    country: "UAE",
    price: "$420",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=700&q=80",
  },
  {
    city: "London",
    country: "United Kingdom",
    price: "$380",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=700&q=80",
  },
  {
    city: "Paris",
    country: "France",
    price: "$410",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=700&q=80",
  },
  {
    city: "Bali",
    country: "Indonesia",
    price: "$370",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=700&q=80",
  },
  {
    city: "New York",
    country: "USA",
    price: "$390",
    image: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=700&q=80",
  },
];

export default function Home() {
  const [language, setLanguage] = useState<LanguageCode>(getLanguageFromStorage);
  useEffect(() => {
    const sync = () => setLanguage(getLanguageFromStorage());
    window.addEventListener("curioticket-language-change", sync as EventListener);
    return () => window.removeEventListener("curioticket-language-change", sync as EventListener);
  }, []);
  const t = useMemo(() => i18n[language], [language]);
  const assurancesLocalized = assurances.map((item, i) => ({ ...item, label: t.assurances[i] }));
  const trustItemsLocalized = trustItems.map((item, i) => ({
    ...item,
    title: t.assurances[i],
  }));
  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-white">
        <section className="relative overflow-hidden bg-[#f6f3ff]">
          <div className="absolute inset-0">
            <Image
              src={heroImage}
              alt="Luxury tropical resort by calm water"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.88)_34%,rgba(255,255,255,0.38)_62%,rgba(255,255,255,0.06)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent" />
          </div>

          <div className="page-shell relative grid min-h-[670px] content-start gap-8 pb-12 pt-12 sm:pt-16">
            <div className="max-w-2xl">
              <h1 className="max-w-xl text-5xl font-black leading-[0.96] tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
                {t.heroTitle}
              </h1>
              <p className="mt-6 max-w-lg text-lg font-semibold leading-8 text-slate-700">
                {t.heroSubtitle}
              </p>
              <div className="mt-7 grid gap-4 text-slate-900 sm:grid-cols-2 lg:grid-cols-4">
                {assurancesLocalized.map((item) => (
                  <CompactAssurance key={item.label} icon={<item.icon size={20} />} label={item.label} />
                ))}
              </div>
            </div>

            <div className="mt-2 max-w-[1080px]">
              <SearchTabs t={t as unknown as Record<string, string>} />
            </div>
          </div>
        </section>

        <section className="page-shell -mt-2 pb-9">
          <div className="grid overflow-hidden rounded-xl border border-violet-100 bg-[#faf7ff] shadow-sm md:grid-cols-2 lg:grid-cols-4">
            {trustItemsLocalized.map((item) => (
              <div key={item.title} className="flex gap-4 border-b border-violet-100 p-5 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#6d28d9] shadow-sm">
                  <item.icon size={20} />
                </span>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-950">{item.title}</h2>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="page-shell py-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black tracking-normal text-slate-950">Popular Destinations</h2>
            <LinkButton href="/hotels/tokyo" variant="ghost" size="sm" className="hidden text-[#6d28d9] sm:inline-flex">
              View all destinations
              <ArrowRight size={16} />
            </LinkButton>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {destinations.map((destination) => (
              <DestinationCard key={destination.city} {...destination} />
            ))}
          </div>
        </section>

        <section className="page-shell grid gap-5 py-9 lg:grid-cols-2">
          <PromoPanel
            tone="violet"
            title="Amazing flight deals just for you"
            body="Unlock exclusive offers on domestic and international flights."
            cta="Explore Flight Deals"
            href="/deals"
            icon={<Plane size={74} />}
          />
          <PromoPanel
            tone="amber"
            title="Find your perfect hotel stay"
            body="From budget to luxury, find hotels that suit your style and budget."
            cta="Explore Hotel Deals"
            href="/hotels/results"
            icon={<Hotel size={74} />}
          />
        </section>

        <section className="page-shell pb-12">
          <div className="grid gap-5 rounded-xl bg-[#f3eafe] p-5 md:grid-cols-[1fr_minmax(280px,520px)] md:items-center">
            <div className="flex gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">Get the best travel deals in your inbox</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">Subscribe to our newsletter and never miss a deal.</p>
              </div>
            </div>
            <form className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="Enter your email address"
                className="focus-ring h-12 min-w-0 flex-1 rounded-md border border-white bg-white px-4 text-sm font-semibold text-slate-950 placeholder:text-slate-400"
                aria-label="Email address"
              />
              <button type="submit" className="focus-ring h-12 rounded-md bg-[#5b21d6] px-8 text-sm font-extrabold text-white transition hover:bg-[#4c1d95]">
                Subscribe
              </button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function CompactAssurance({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/85 text-[#6d28d9] shadow-sm">{icon}</span>
      <span className="max-w-28 text-xs font-black leading-4">{label}</span>
    </div>
  );
}

function DestinationCard({ city, country, price, image }: { city: string; country: string; price: string; image: string }) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-44">
        <Image src={image} alt={`${city}, ${country}`} fill sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
        <button type="button" className="focus-ring absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur" aria-label={`Save ${city}`}>
          <Heart size={17} />
        </button>
        <div className="absolute bottom-3 left-3 text-white">
          <h3 className="text-xl font-black">{city}</h3>
          <p className="text-sm font-semibold">{country}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 p-4 text-sm font-bold text-slate-700">
        From <span className="text-lg font-black text-[#6d28d9]">{price}</span>
      </div>
    </article>
  );
}

function PromoPanel({
  tone,
  title,
  body,
  cta,
  href,
  icon,
}: {
  tone: "violet" | "amber";
  title: string;
  body: string;
  cta: string;
  href: string;
  icon: ReactNode;
}) {
  const isViolet = tone === "violet";
  return (
    <article className={`relative min-h-56 overflow-hidden rounded-xl p-8 ${isViolet ? "bg-[#f1e8ff]" : "bg-[#fff3e3]"}`}>
      <div className="relative z-10 max-w-xs">
        <h2 className="text-2xl font-black leading-tight text-slate-950">{title}</h2>
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">{body}</p>
        <LinkButton href={href} variant="primary" size="md" className={`mt-5 ${isViolet ? "bg-[#5b21d6] hover:bg-[#4c1d95]" : "bg-[#e87817] hover:bg-[#c75f0b]"}`}>
          {cta}
          <ArrowRight size={16} />
        </LinkButton>
      </div>
      <div className={`absolute bottom-5 right-6 flex h-40 w-40 items-center justify-center rounded-full ${isViolet ? "bg-white/55 text-[#6d28d9]" : "bg-white/70 text-[#e87817]"}`}>
        <Sparkles className="absolute left-5 top-5 opacity-40" size={24} />
        <CircleDollarSign className="absolute right-7 top-7 opacity-40" size={26} />
        {icon}
      </div>
    </article>
  );
}
