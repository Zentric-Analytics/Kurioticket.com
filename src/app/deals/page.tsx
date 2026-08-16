"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, type CSSProperties } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { DealsSearchForm } from "@/components/search/DealsSearchForm";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import { createDefaultDealsSearch, buildDealsModifyUrl } from "@/lib/deals/dealsSearchParams";

const dealsHeroImage = "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?auto=format&fit=crop&w=2400&q=90";
const packagesHeroImage =
  "/images/premium/packages/kurioticket-packages-hero-tropical-resort-001.jpg";
const destinationIdeas = [
  ["tokyo", "Tokyo", "https://images.pexels.com/photos/31344755/pexels-photo-31344755.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  ["london", "London", "https://images.pexels.com/photos/33843218/pexels-photo-33843218.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  ["paris", "Paris", "https://images.pexels.com/photos/2082103/pexels-photo-2082103.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  ["dubai", "Dubai", "https://images.pexels.com/photos/21765772/pexels-photo-21765772.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  ["cancun", "Cancun", "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=1200&q=80"],
  ["rome", "Rome", "https://images.pexels.com/photos/1701595/pexels-photo-1701595.jpeg?auto=compress&cs=tinysrgb&w=1200"],
] as const;

export default function DealsPage() {
  const pathname = usePathname();
  const heroImage = pathname === "/packages" ? packagesHeroImage : dealsHeroImage;
  const { t: dictionary } = useLocale();
  const t = useCallback(
  (key: string) => dictionary[key] ?? enTranslations[key] ?? key,
  [dictionary],
);
  const dealsPageRef = useRef<HTMLDivElement | null>(null);
  const dealsSearchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const pageElement = dealsPageRef.current;
    const searchElement = dealsSearchRef.current;

    if (!pageElement || !searchElement || typeof ResizeObserver === "undefined") return;

    let animationFrame = 0;

    const updateSearchHeight = () => {
      const { height } = searchElement.getBoundingClientRect();

      if (!Number.isFinite(height) || height <= 0) return;

      const desktopLayout = window.matchMedia("(min-width: 1024px)").matches;
      const insideHeight = desktopLayout ? height * 0.44 : Math.min(height, 128);

      pageElement.style.setProperty("--deals-search-inside", `${insideHeight}px`);
      pageElement.style.setProperty(
        "--deals-search-outside",
        `${Math.max(0, height - insideHeight)}px`,
      );
    };

    const scheduleUpdate = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        animationFrame = 0;
        updateSearchHeight();
      });
    };

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(searchElement);
    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <><AppHeader /><main ref={dealsPageRef} className="flex-1 bg-slate-50 pb-12" style={{ "--deals-search-inside": "0px", "--deals-search-outside": "0px" } as CSSProperties}>
    <section className="relative h-96 overflow-visible border-b border-slate-200 bg-[#F6F9FC] shadow-[0_18px_45px_rgba(15,23,42,0.06)] lg:h-[390px]">
      <div className="absolute inset-0 overflow-hidden bg-slate-800"><Image src={heroImage} alt="" fill priority quality={90} sizes="100vw" className={`object-cover object-[center_52%] ${pathname === "/packages" ? "lg:object-[center_62%]" : "lg:object-[center_48%]"}`} /></div>
      <div ref={dealsSearchRef} className="page-shell absolute inset-x-0 bottom-[calc(-1_*_var(--deals-search-outside))] z-20 lg:bottom-0 lg:translate-y-[56%]"><div className="mx-auto max-w-[1280px]"><Suspense fallback={<div className="min-h-80 rounded-3xl bg-white/90" />}><DealsSearchForm presentation={pathname === "/packages" ? "packages-landing" : "desktop-landing"} /></Suspense></div></div>
    </section>
    <section className="page-shell pt-[calc(var(--deals-search-outside)+3rem)] lg:pt-[calc(var(--deals-search-outside)+6.5rem)]"><h2 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">{t("deals.destinationIdeasTitle")}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{t("deals.destinationIdeasSubtitle")}</p><div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">{destinationIdeas.map(([key, city, image]) => { const search = createDefaultDealsSearch(); search.hotelDestination = city; search.carPickupLocation = city; return <Link key={key} href={buildDealsModifyUrl(search)} aria-label={`${t("deals.destinationCardAriaPrefix")} ${t(`deals.destination.${key}.city`)}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#004BB8]/25 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"><div className="relative aspect-[4/3] overflow-hidden bg-slate-100"><Image src={image} alt={t(`deals.destination.${key}.imageAlt`)} fill sizes="(min-width:1024px) 33vw, 50vw" className="object-cover transition duration-300 group-hover:scale-105" /></div><div className="p-4"><p className="font-extrabold text-slate-950">{t(`deals.destination.${key}.city`)}</p><p className="mt-1 text-sm text-slate-600">{t(`deals.destination.${key}.country`)}</p></div></Link>; })}</div></section>
  </main><Footer /></>;
}
