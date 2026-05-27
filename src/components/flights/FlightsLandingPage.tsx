import Link from "next/link";
import { ArrowRight, Compass, ShieldCheck, Sparkles } from "lucide-react";

import {
  curatedRoutes,
  flightFaqs,
  flightValuePoints,
} from "@/data/flightsLanding";

export function FlightsLandingPage() {
  return (
    <main className="flex-1 bg-slate-50">
      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_20%_10%,#ede9fe_0%,#eef2ff_28%,#f8fafc_60%,#f8fafc_100%)]">
        <div className="page-shell py-16 sm:py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">
                <Sparkles size={14} />
                Curioticket Flights
              </span>

              <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Fly farther with confidence, clarity, and control.
              </h1>

              <p className="max-w-xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
                Discover routes built for real travel decisions. Compare options fast, understand itinerary trade-offs, and move into results when you're ready to book.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/flights/results"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  Start flight search
                  <ArrowRight size={16} />
                </Link>

                <Link
                  href="#route-preview"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400"
                >
                  Explore route ideas
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-[0_20px_70px_rgba(99,102,241,0.15)] sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-indigo-700">
                Why travelers choose Curioticket
              </h2>

              <div className="mt-4 grid gap-4">
                {flightValuePoints.map((point) => (
                  <article
                    key={point.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <h3 className="text-base font-semibold text-slate-900">{point.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{point.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="route-preview" className="page-shell py-12 sm:py-14">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">Curated flight routes</h2>
          <Compass className="text-indigo-600" size={22} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {curatedRoutes.map((route) => (
            <article key={`${route.origin}-${route.destination}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                {route.tag}
              </span>
              <h3 className="mt-3 text-xl font-bold text-slate-900">
                {route.origin} <span className="text-slate-400">→</span> {route.destination}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{route.blurb}</p>
            </article>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Route cards are destination inspiration only and do not display live fares.
        </p>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="page-shell py-12 sm:py-14">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">Flight guidance</h2>
          <div className="mt-6 grid gap-4">
            {flightFaqs.map((faq) => (
              <article key={faq.question} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-base font-semibold text-slate-900">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell py-12 sm:py-14">
        <div className="rounded-3xl border border-indigo-200 bg-indigo-600 p-8 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Ready to plan your next flight?</h2>
              <p className="mt-2 max-w-2xl text-sm text-indigo-100 sm:text-base">
                Open the Curioticket flight workspace to search routes, compare itineraries, and continue your booking flow.
              </p>
            </div>
            <Link
              href="/flights/results"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              Continue to flight results
              <ShieldCheck size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
