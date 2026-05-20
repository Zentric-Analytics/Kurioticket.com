"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import {
  ArrowRight,
  BadgeDollarSign,
  BellRing,
  CreditCard,
  Globe2,
  Headphones,
  Hotel,
  Plane,
  ShieldCheck,
  SlidersHorizontal,
  TicketCheck,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SearchTabs } from "@/components/search/SearchTabs";
import { LinkButton } from "@/components/ui/Button";

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

export default function HomePage() {
  return (
    <>
      <AppHeader brandVariant="homepage" />
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
                Find Cheap Flights Fast
              </h1>
              <p className="mt-6 max-w-lg text-lg font-semibold leading-8 text-slate-700">
                Search hundreds of airlines and travel sites to find the best deals for your next trip.
              </p>
              <div className="mt-7 grid gap-4 text-slate-900 sm:grid-cols-2 lg:grid-cols-4">
                {assurances.map((item) => (
                  <CompactAssurance key={item.label} icon={<item.icon size={20} />} label={item.label} />
                ))}
              </div>
            </div>

            <div className="mt-2 max-w-[1080px]">
              <SearchTabs />
            </div>
          </div>
        </section>

        <section className="page-shell -mt-2 pb-9">
          <div className="grid overflow-hidden rounded-xl border border-violet-100 bg-[#faf7ff] shadow-sm md:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item) => (
              <div
                key={item.title}
                className="flex gap-4 border-b border-violet-100 p-5 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"
              >
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
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#6d28d9] text-white">
                <BellRing size={24} />
              </span>
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
    <article className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-36">
        <Image src={image} alt={`${city}, ${country}`} fill sizes="(min-width: 1024px) 20vw, 50vw" className="object-cover" />
      </div>
      <div className="p-4">
        <h3 className="text-base font-black text-slate-950">{city}</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">{country}</p>
        <p className="mt-3 text-sm font-black text-[#6d28d9]">From {price}</p>
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
    <div className={isViolet ? "rounded-xl bg-[#efe7ff] p-6 text-slate-950" : "rounded-xl bg-[#fff1dc] p-6 text-slate-950"}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="max-w-sm text-2xl font-black tracking-normal">{title}</h2>
          <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-600">{body}</p>
          <LinkButton href={href} variant="primary" size="sm" className="mt-5">
            {cta}
            <ArrowRight size={16} />
          </LinkButton>
        </div>
        <span className={isViolet ? "hidden text-[#6d28d9] sm:block" : "hidden text-[#f97316] sm:block"}>{icon}</span>
      </div>
    </div>
  );
}