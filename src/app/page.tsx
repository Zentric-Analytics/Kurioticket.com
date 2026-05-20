"use client";

import type { ReactNode } from "react";
import Image from "next/image";

import {
  ArrowRight,
  BellRing,
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
  return (
    <>
      <AppHeader brandVariant="homepage" />

      <main className="flex-1 bg-white">
        <section className="relative overflow-hidden bg-[#f6f3ff] pb-16">
          <div className="absolute inset-0">
            <Image
              src={heroImage}
              alt="Luxury tropical resort by calm water"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.85)_44%,rgba(255,255,255,0.96)_100%)]" />
          </div>

          <div className="page-shell relative pt-14 sm:pt-18">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#6d28d9]">
                Plan Better Trips
              </p>

              <h1 className="mt-4 text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Find Cheap Flights Fast
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-slate-700 sm:text-lg">
                Search hundreds of airlines and travel sites to find the best
                deals for your next trip.
              </p>
            </div>

            <div className="mx-auto mt-10 max-w-[1140px] rounded-[24px] border border-violet-100/80 bg-white/95 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.11)] backdrop-blur sm:p-4">
              <SearchTabs />
            </div>
          </div>
        </section>

        <section className="page-shell py-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black tracking-normal text-slate-950">
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

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {destinations.map((destination) => (
              <DestinationCard
                key={destination.city}
                {...destination}
              />
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
                <h2 className="text-lg font-black text-slate-950">
                  Get the best travel deals in your inbox
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Subscribe to our newsletter and never miss a deal.
                </p>
              </div>
            </div>

            <form className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="Enter your email address"
                className="focus-ring h-12 min-w-0 flex-1 rounded-md border border-white bg-white px-4 text-sm font-semibold text-slate-950 placeholder:text-slate-400"
                aria-label="Email address"
              />

              <button
                type="submit"
                className="focus-ring h-12 rounded-md bg-[#5b21d6] px-8 text-sm font-extrabold text-white transition hover:bg-[#4c1d95]"
              >
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
      <div className="relative h-44">
        <Image
          src={image}
          alt={`${city}, ${country}`}
          fill
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />

        <button
          type="button"
          className="focus-ring absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur"
          aria-label={`Save ${city}`}
        >
          <Heart size={17} />
        </button>

        <div className="absolute bottom-3 left-3 text-white">
          <h3 className="text-xl font-black">{city}</h3>
          <p className="text-sm font-semibold">{country}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-4 text-sm font-bold text-slate-700">
        From
        <span className="text-lg font-black text-[#6d28d9]">
          {price}
        </span>
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
    <article
      className={`relative min-h-56 overflow-hidden rounded-xl p-8 ${
        isViolet ? "bg-[#f1e8ff]" : "bg-[#fff3e3]"
      }`}
    >
      <div className="relative z-10 max-w-xs">
        <h2 className="text-2xl font-black leading-tight text-slate-950">
          {title}
        </h2>

        <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">
          {body}
        </p>

        <LinkButton
          href={href}
          variant="primary"
          size="md"
          className={`mt-5 ${
            isViolet
              ? "bg-[#5b21d6] hover:bg-[#4c1d95]"
              : "bg-[#e87817] hover:bg-[#c75f0b]"
          }`}
        >
          {cta}
          <ArrowRight size={16} />
        </LinkButton>
      </div>

      <div
        className={`absolute bottom-5 right-6 flex h-40 w-40 items-center justify-center rounded-full ${
          isViolet
            ? "bg-white/55 text-[#6d28d9]"
            : "bg-white/70 text-[#e87817]"
        }`}
      >
        <Sparkles
          className="absolute left-5 top-5 opacity-40"
          size={24}
        />

        <CircleDollarSign
          className="absolute right-7 top-7 opacity-40"
          size={26}
        />

        {icon}
      </div>
    </article>
  );
}