"use client";

import { useEffect, useState } from "react";

const items = [
  { id: "hotel-compare-prices", label: "Compare prices", section: "compare" },
  { id: "hotel-about", label: "About", section: "about" },
  { id: "hotel-location", label: "Location", section: "location" },
] as const;

type ActiveSection = (typeof items)[number]["section"];

export function HotelDetailsSectionNav() {
  const [active, setActive] = useState<ActiveSection>("compare");

  useEffect(() => {
    const sectionMap: Record<string, ActiveSection> = {
      "hotel-compare-prices": "compare",
      "hotel-about": "about",
      "hotel-reviews": "about",
      "hotel-location": "location",
    };
    const elements = Object.keys(sectionMap)
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!elements.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(sectionMap[visible.target.id]);
      },
      { rootMargin: "-72px 0px -55% 0px", threshold: [0, 0.15, 0.4] },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  function navigate(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <nav
      aria-label="Hotel details sections"
      className="sticky top-0 z-30 mt-3 grid grid-cols-3 border-b border-slate-200 bg-white px-4 lg:mt-5 lg:px-0"
      data-hotel-details-section-nav
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={active === item.section ? "location" : undefined}
          onClick={(event) => navigate(event, item.id)}
          className={`focus-ring relative inline-flex min-h-11 items-center justify-center whitespace-nowrap px-1 text-[13px] font-bold transition-colors sm:px-2 sm:text-sm ${active === item.section ? "text-blue" : "text-slate-600 hover:text-slate-950"}`}
        >
          {item.label}
          <span className={`absolute inset-x-2 bottom-0 h-0.5 bg-blue transition-opacity ${active === item.section ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}
