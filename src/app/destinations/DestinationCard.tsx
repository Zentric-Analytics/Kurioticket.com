"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const destinationImageFallback =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95";

type DestinationCardProps = {
  href: string;
  name: string;
  country: string;
  image: string;
  imageAlt: string;
  imagePosition?: string;
  tag: string;
  subtitle: string;
  ariaLabel: string;
};

export function DestinationCard({
  href,
  name,
  country,
  image,
  imageAlt,
  imagePosition = "center",
  tag,
  subtitle,
  ariaLabel,
}: DestinationCardProps) {
  const [imageSource, setImageSource] = useState(image);

  return (
    <Link
      href={href}
      className="group relative min-h-[18rem] overflow-hidden rounded-[1.45rem] bg-white p-4 text-white shadow-[0_18px_45px_-28px_rgba(2,28,43,0.35)] outline-none ring-1 ring-white/80 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_-30px_rgba(0,75,184,0.38)] focus-visible:ring-4 focus-visible:ring-[#004BB8]/30 sm:min-h-[19.5rem]"
      aria-label={ariaLabel}
    >
      <Image
        src={imageSource}
        alt={imageAlt}
        fill
        quality={92}
        priority={false}
        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover brightness-[1.18] contrast-[1.08] saturate-[1.32] transition duration-700 ease-out group-hover:scale-105 group-hover:brightness-[1.23] group-hover:saturate-[1.42]"
        style={{ objectPosition: imagePosition }}
        onError={() => {
          if (imageSource !== destinationImageFallback) {
            setImageSource(destinationImageFallback);
          }
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.03)_0%,rgba(15,23,42,0.08)_46%,rgba(15,23,42,0.58)_100%)] transition duration-300 group-hover:bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.06)_46%,rgba(15,23,42,0.50)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#021C2B]/62 via-slate-950/16 to-transparent" />
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-white/24 blur-2xl transition duration-500 group-hover:scale-110" />

      <div className="relative flex h-full min-h-[16rem] flex-col justify-between sm:min-h-[18rem]">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 max-w-[calc(100%-3rem)] rounded-full bg-white/30 px-3 py-1 text-[0.7rem] font-black uppercase leading-tight tracking-[0.13em] text-white shadow-sm ring-1 ring-white/45 backdrop-blur-md [overflow-wrap:anywhere]">
            {country}
          </span>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/30 text-base font-black shadow-sm ring-1 ring-white/45 backdrop-blur-md transition group-hover:bg-white group-hover:text-[#004BB8]">
            →
          </span>
        </div>

        <div className="rounded-[1.25rem] border border-white/16 bg-slate-950/16 p-3.5 shadow-xl shadow-slate-950/15 backdrop-blur-[2px] transition duration-300 group-hover:border-white/30 group-hover:bg-slate-950/10 sm:p-4">
          <p className="mb-1.5 text-[0.7rem] font-black uppercase leading-tight tracking-[0.16em] text-[#EAF7F6] [overflow-wrap:anywhere]">
            {tag}
          </p>
          <h3 className="text-xl font-black leading-tight tracking-tight drop-shadow-md sm:text-2xl">
            {name}
          </h3>
          <p className="mt-1.5 text-sm font-semibold leading-5 text-white/95 drop-shadow-sm">
            {subtitle}
          </p>
        </div>
      </div>
    </Link>
  );
}
