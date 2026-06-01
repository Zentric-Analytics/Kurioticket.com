import Image from "next/image";
import Link from "next/link";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { LinkButton } from "@/components/ui/Button";

const destinationSections = [
  {
    region: "Europe",
    eyebrow: "Historic cities, iconic food, and storybook streets",
    destinations: [
      {
        name: "London",
        image:
          "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Paris",
        image:
          "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Rome",
        image:
          "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Amsterdam",
        image:
          "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    region: "Middle East",
    eyebrow: "Skyline stays, warm hospitality, and desert luxury",
    destinations: [
      {
        name: "Dubai",
        image:
          "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Doha",
        image:
          "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Abu Dhabi",
        image:
          "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    region: "Africa",
    eyebrow: "Vibrant culture, coastal escapes, and safari gateways",
    destinations: [
      {
        name: "Lagos",
        image:
          "https://images.unsplash.com/photo-1577948000111-9c970dfe3743?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Abuja",
        image:
          "https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Cape Town",
        image:
          "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Nairobi",
        image:
          "https://images.unsplash.com/photo-1611348586804-61bf6c080437?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    region: "North America",
    eyebrow: "Big-city energy, landmark views, and coast-to-coast fun",
    destinations: [
      {
        name: "New York",
        image:
          "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Toronto",
        image:
          "https://images.unsplash.com/photo-1517935706615-2717063c2225?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Los Angeles",
        image:
          "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    region: "Asia",
    eyebrow: "Neon nights, food markets, temples, and urban adventures",
    destinations: [
      {
        name: "Singapore",
        image:
          "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Bangkok",
        image:
          "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Tokyo",
        image:
          "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Kuala Lumpur",
        image:
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
];

export default function DestinationsPage() {
  return (
    <>
      <AppHeader />

      <main className="flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.18),transparent_34rem),linear-gradient(180deg,#f5f3ff_0%,#ffffff_42%,#f8fafc_100%)]">
        <section className="page-shell py-12 sm:py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.48fr)] lg:items-end">
            <div>
              <p className="inline-flex rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-violet-700 shadow-sm shadow-violet-100/70">
                Travel Inspiration
              </p>

              <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-tight text-indigo-950 sm:text-6xl lg:text-7xl">
                Destinations
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Discover popular destinations and travel ideas for your next journey.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-xl shadow-violet-950/10 backdrop-blur">
              <p className="text-sm font-semibold text-slate-500">
                Curated by region
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-bold text-indigo-950">
                {destinationSections.map((section) => (
                  <a
                    key={section.region}
                    href={`#${section.region.toLowerCase().replaceAll(" ", "-")}`}
                    className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-100/80 hover:text-violet-800"
                  >
                    {section.region}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell pb-16 lg:pb-20">
          <div className="space-y-12">
            {destinationSections.map((section) => (
              <section
                key={section.region}
                id={section.region.toLowerCase().replaceAll(" ", "-")}
                className="scroll-mt-24"
              >
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-indigo-950 sm:text-3xl">
                      {section.region}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-slate-600">
                      {section.eyebrow}
                    </p>
                  </div>

                  <span className="text-sm font-semibold text-violet-700">
                    {section.destinations.length} destination{section.destinations.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.destinations.map((destination, index) => (
                    <Link
                      key={destination.name}
                      href={`/flights/results?destination=${encodeURIComponent(destination.name)}`}
                      className={`group relative min-h-[17rem] overflow-hidden rounded-[1.75rem] border border-white/70 bg-slate-900 shadow-lg shadow-slate-950/10 outline-none transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-950/20 focus-visible:ring-4 focus-visible:ring-violet-300 ${
                        index === 0 ? "lg:col-span-2 xl:col-span-2" : ""
                      }`}
                    >
                      <Image
                        src={destination.image}
                        alt={`${destination.name} destination view`}
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-slate-950/10 transition group-hover:from-violet-950/80" />
                      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                        <div className="mb-3 inline-flex rounded-full bg-white/18 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] backdrop-blur">
                          {section.region}
                        </div>
                        <h3 className="text-2xl font-black tracking-tight drop-shadow-sm">
                          {destination.name}
                        </h3>
                        <p className="mt-2 text-sm font-medium text-white/85 opacity-0 transition duration-300 group-hover:opacity-100">
                          Explore flights, stays, and deals for {destination.name}.
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="page-shell pb-16 lg:pb-24">
          <div className="relative overflow-hidden rounded-[2rem] bg-indigo-950 px-6 py-10 text-white shadow-2xl shadow-indigo-950/20 sm:px-10 lg:px-14">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-500/30 blur-2xl" />
            <div className="absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-fuchsia-400/20 blur-2xl" />

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
