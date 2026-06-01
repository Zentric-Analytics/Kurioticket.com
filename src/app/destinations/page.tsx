import Image from "next/image";
import Link from "next/link";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { LinkButton } from "@/components/ui/Button";

const destinationSections = [
  {
    region: "Europe",
    accent: "from-blue-600 to-violet-600",
    summary: "Classic city breaks with culture, food, landmarks, and easy rail connections.",
    destinations: [
      {
        name: "London",
        country: "United Kingdom",
        image:
          "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1400&q=85",
        tag: "Theatre & landmarks",
      },
      {
        name: "Paris",
        country: "France",
        image:
          "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=85",
        tag: "Romantic escape",
      },
      {
        name: "Rome",
        country: "Italy",
        image:
          "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1400&q=85",
        tag: "History & food",
      },
      {
        name: "Amsterdam",
        country: "Netherlands",
        image:
          "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1400&q=85",
        tag: "Canals & museums",
      },
    ],
  },
  {
    region: "Middle East",
    accent: "from-amber-500 to-fuchsia-600",
    summary: "Warm weather, statement hotels, skyline views, and effortless luxury escapes.",
    destinations: [
      {
        name: "Dubai",
        country: "United Arab Emirates",
        image:
          "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=85",
        tag: "Luxury skyline",
      },
      {
        name: "Doha",
        country: "Qatar",
        image:
          "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?auto=format&fit=crop&w=1400&q=85",
        tag: "Culture & coast",
      },
      {
        name: "Abu Dhabi",
        country: "United Arab Emirates",
        image:
          "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1400&q=85",
        tag: "Island resorts",
      },
    ],
  },
  {
    region: "Africa",
    accent: "from-emerald-600 to-violet-600",
    summary: "Creative cities, coastal views, national parks, and bold cultural energy.",
    destinations: [
      {
        name: "Lagos",
        country: "Nigeria",
        image:
          "https://images.unsplash.com/photo-1577948000111-9c970dfe3743?auto=format&fit=crop&w=1400&q=85",
        tag: "Nightlife & culture",
      },
      {
        name: "Abuja",
        country: "Nigeria",
        image:
          "https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?auto=format&fit=crop&w=1400&q=85",
        tag: "Capital getaway",
      },
      {
        name: "Cape Town",
        country: "South Africa",
        image:
          "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=1400&q=85",
        tag: "Mountains & ocean",
      },
      {
        name: "Nairobi",
        country: "Kenya",
        image:
          "https://images.unsplash.com/photo-1611348586804-61bf6c080437?auto=format&fit=crop&w=1400&q=85",
        tag: "Safari gateway",
      },
    ],
  },
  {
    region: "North America",
    accent: "from-sky-600 to-indigo-700",
    summary: "Big-city weekends, beach days, entertainment, shopping, and iconic skylines.",
    destinations: [
      {
        name: "New York",
        country: "United States",
        image:
          "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=1400&q=85",
        tag: "City icons",
      },
      {
        name: "Toronto",
        country: "Canada",
        image:
          "https://images.unsplash.com/photo-1517935706615-2717063c2225?auto=format&fit=crop&w=1400&q=85",
        tag: "Food & skyline",
      },
      {
        name: "Los Angeles",
        country: "United States",
        image:
          "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=1400&q=85",
        tag: "Sun & studios",
      },
    ],
  },
  {
    region: "Asia",
    accent: "from-rose-500 to-violet-700",
    summary: "Street food, night markets, futuristic skylines, temples, and city adventures.",
    destinations: [
      {
        name: "Singapore",
        country: "Singapore",
        image:
          "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1400&q=85",
        tag: "Garden city",
      },
      {
        name: "Bangkok",
        country: "Thailand",
        image:
          "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1400&q=85",
        tag: "Food markets",
      },
      {
        name: "Tokyo",
        country: "Japan",
        image:
          "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1400&q=85",
        tag: "Neon nights",
      },
      {
        name: "Kuala Lumpur",
        country: "Malaysia",
        image:
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1400&q=85",
        tag: "Towers & food",
      },
    ],
  },
];

const featuredDestinations = [
  destinationSections[0].destinations[1],
  destinationSections[1].destinations[0],
  destinationSections[2].destinations[2],
];

const travelStyles = [
  "Weekend city breaks",
  "Luxury hotel deals",
  "Beach and skyline escapes",
  "Culture-first trips",
];

export default function DestinationsPage() {
  return (
    <>
      <AppHeader />

      <main className="flex-1 bg-[#f5f7fb] text-slate-950">
        <section className="relative overflow-hidden bg-[#f5f7fb]">
          <div className="absolute inset-x-0 top-0 h-[30rem] bg-[linear-gradient(135deg,#2b136f_0%,#5b21b6_45%,#0f172a_100%)]" />
          <div className="absolute left-[8%] top-10 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="absolute right-[10%] top-20 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />

          <div className="page-shell relative py-8 sm:py-12 lg:py-14">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.58fr)] lg:items-stretch">
              <div className="flex min-h-[31rem] flex-col justify-between rounded-[2rem] bg-white p-5 shadow-2xl shadow-slate-950/20 sm:p-8 lg:p-10">
                <div>
                  <p className="inline-flex rounded-full bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-700">
                    Travel Inspiration
                  </p>

                  <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-[-0.05em] text-slate-950 sm:text-6xl lg:text-7xl">
                    Destinations
                  </h1>

                  <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                    Discover popular destinations and travel ideas for your next journey.
                  </p>
                </div>

                <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/80">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                          Explore by vibe
                        </p>
                        <p className="mt-1 text-base font-black text-slate-950">
                          Culture, food, beaches
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                          Plan faster
                        </p>
                        <p className="mt-1 text-base font-black text-slate-950">
                          Flights, hotels, cars
                        </p>
                      </div>
                    </div>

                    <LinkButton
                      href="/deals"
                      variant="accent"
                      size="lg"
                      className="h-14 rounded-2xl px-7 text-base shadow-lg shadow-violet-200"
                    >
                      Search Travel Deals
                    </LinkButton>
                  </div>
                </div>
              </div>

              <div className="grid min-h-[31rem] grid-cols-2 gap-4">
                {featuredDestinations.map((destination, index) => (
                  <Link
                    key={destination.name}
                    href={`/flights/results?destination=${encodeURIComponent(destination.name)}`}
                    className={`group relative overflow-hidden rounded-[2rem] bg-slate-900 shadow-2xl shadow-slate-950/20 outline-none transition duration-300 hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-violet-200 ${
                      index === 0 ? "col-span-2" : ""
                    }`}
                  >
                    <Image
                      src={destination.image}
                      alt={`${destination.name} destination skyline`}
                      fill
                      priority={index === 0}
                      sizes={index === 0 ? "(min-width: 1024px) 40vw, 100vw" : "(min-width: 1024px) 20vw, 50vw"}
                      className="object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                        Featured destination
                      </p>
                      <h2 className="mt-2 text-3xl font-black tracking-tight">
                        {destination.name}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-white/85">
                        {destination.tag}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell -mt-2 pb-10">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">
                  Browse destination ideas
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Jump to a region or filter your inspiration by trip style.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {destinationSections.map((section) => (
                  <a
                    key={section.region}
                    href={`#${section.region.toLowerCase().replaceAll(" ", "-")}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                  >
                    {section.region}
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {travelStyles.map((style) => (
                <span
                  key={style}
                  className="shrink-0 rounded-full bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700"
                >
                  {style}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="page-shell pb-16 lg:pb-20">
          <div className="space-y-14">
            {destinationSections.map((section) => (
              <section
                key={section.region}
                id={section.region.toLowerCase().replaceAll(" ", "-")}
                className="scroll-mt-24"
              >
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="max-w-2xl">
                    <div className={`mb-3 h-1.5 w-16 rounded-full bg-gradient-to-r ${section.accent}`} />
                    <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                      {section.region}
                    </h2>
                    <p className="mt-2 text-base leading-7 text-slate-600">
                      {section.summary}
                    </p>
                  </div>

                  <Link
                    href="/deals"
                    className="text-sm font-black text-violet-700 transition hover:text-violet-900"
                  >
                    View deals
                  </Link>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {section.destinations.map((destination, index) => (
                    <Link
                      key={destination.name}
                      href={`/flights/results?destination=${encodeURIComponent(destination.name)}`}
                      className={`group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-lg shadow-slate-200/80 outline-none transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-200/70 focus-visible:ring-4 focus-visible:ring-violet-200 ${
                        index === 0 ? "md:col-span-2" : ""
                      }`}
                    >
                      <div className="relative h-64 overflow-hidden bg-slate-900">
                        <Image
                          src={destination.image}
                          alt={`${destination.name}, ${destination.country}`}
                          fill
                          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                          className="object-cover transition duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-violet-700 shadow-lg backdrop-blur">
                          {destination.tag}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                          <h3 className="text-3xl font-black tracking-tight drop-shadow-sm">
                            {destination.name}
                          </h3>
                          <p className="mt-1 text-sm font-semibold text-white/85">
                            {destination.country}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 p-5">
                        <div>
                          <p className="text-sm font-bold text-slate-500">
                            Flights • Hotels • Cars
                          </p>
                          <p className="mt-1 text-base font-black text-slate-950">
                            Plan a trip to {destination.name}
                          </p>
                        </div>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-50 text-lg font-black text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white">
                          →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="page-shell pb-16 lg:pb-24">
          <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#2b136f,#6d28d9_52%,#111827)] px-6 py-10 text-white shadow-2xl shadow-violet-950/25 sm:px-10 lg:px-14">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-400/25 blur-2xl" />
            <div className="absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-blue-400/20 blur-2xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-violet-200">
                  Start exploring
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  Ready to plan your next trip?
                </h2>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <LinkButton
                  href="/deals"
                  variant="accent"
                  size="lg"
                  className="rounded-full px-6 shadow-lg shadow-violet-950/20"
                >
                  Search Travel Deals
                </LinkButton>
                <Link
                  href="/"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Homepage
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
