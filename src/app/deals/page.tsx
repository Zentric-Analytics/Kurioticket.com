"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { DealsSearchForm } from "@/components/search/DealsSearchForm";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as en } from "@/lib/i18n/en";
import { createDefaultDealsSearch, buildDealsModifyUrl } from "@/lib/deals/dealsSearchParams";

const dealsHeroImage = "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?auto=format&fit=crop&w=1200&q=80";
const destinationIdeas = [
  ["tokyo", "Tokyo", "https://images.pexels.com/photos/31344755/pexels-photo-31344755.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  ["london", "London", "https://images.pexels.com/photos/33843218/pexels-photo-33843218.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  ["paris", "Paris", "https://images.pexels.com/photos/2082103/pexels-photo-2082103.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  ["dubai", "Dubai", "https://images.pexels.com/photos/21765772/pexels-photo-21765772.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  ["cancun", "Cancun", "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=1200&q=80"],
  ["rome", "Rome", "https://images.pexels.com/photos/1701595/pexels-photo-1701595.jpeg?auto=compress&cs=tinysrgb&w=1200"],
] as const;

export default function DealsPage() {
  const { t: dictionary } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  return <><AppHeader /><main className="flex-1 bg-slate-50 pb-12">
    <section className="relative overflow-hidden border-b border-slate-200 bg-[#F6F9FC] pb-12 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="absolute inset-0"><Image src={dealsHeroImage} alt="" fill priority sizes="100vw" className="object-cover object-[center_52%]" /><div className="absolute inset-0 bg-gradient-to-br from-slate-950/25 via-slate-100/20 to-sky-100/10" /><div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(248,250,252,0.82)_0%,rgba(248,250,252,0.5)_45%,rgba(248,250,252,0.12)_75%)]" /></div>
      <div className="page-shell relative z-10 pt-8 sm:pt-14"><h1 className="max-w-4xl text-balance text-3xl font-semibold tracking-tight text-slate-800 sm:text-4xl">{t("deals.heroTitle")}</h1><p className="mt-3 max-w-2xl text-base font-medium leading-7 text-slate-700">{t("deals.heroSubtitle")}</p><div className="mt-8 sm:mt-10"><Suspense fallback={<div className="min-h-80 rounded-3xl bg-white/90" />}><DealsSearchForm /></Suspense></div></div>
    </section>
    <section className="page-shell pt-10 sm:pt-14"><h2 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">{t("deals.destinationIdeasTitle")}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{t("deals.destinationIdeasSubtitle")}</p><div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">{destinationIdeas.map(([key, city, image]) => { const search = createDefaultDealsSearch(); search.hotelDestination = city; search.carPickupLocation = city; return <Link key={key} href={buildDealsModifyUrl(search)} aria-label={`${t("deals.destinationCardAriaPrefix")} ${t(`deals.destination.${key}.city`)}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#004BB8]/25 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"><div className="relative aspect-[4/3] overflow-hidden bg-slate-100"><Image src={image} alt={t(`deals.destination.${key}.imageAlt`)} fill sizes="(min-width:1024px) 33vw, 50vw" className="object-cover transition duration-300 group-hover:scale-105" /></div><div className="p-4"><p className="font-extrabold text-slate-950">{t(`deals.destination.${key}.city`)}</p><p className="mt-1 text-sm text-slate-600">{t(`deals.destination.${key}.country`)}</p></div></Link>; })}</div></section>
  </main><Footer /></>;
}
