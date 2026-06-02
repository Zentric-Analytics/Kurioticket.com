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
}: DestinationCardProps) {
  const [imageSource, setImageSource] = useState(image);

  return (
    <Link
      href={href}
      className="group relative min-h-[23rem] overflow-hidden rounded-[1.6rem] bg-white p-5 text-white shadow-xl shadow-violet-100/80 outline-none ring-1 ring-white/80 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-fuchsia-200/70 focus-visible:ring-4 focus-visible:ring-violet-200 sm:min-h-[25rem]"
      aria-label={`Search flights to ${name}`}
    >
      <Image
        src={imageSource}
        alt={imageAlt}
        fill
        quality={92}
        priority={false}
        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover brightness-[1.18] contrast-[1.08] saturate-[1.32] transition duration-700 ease-out group-hover:scale-105 group-hover:brightness-[1.24] group-hover:saturate-[1.45]"
        style={{ objectPosition: imagePosition }}
        onError={() => {
          if (imageSource !== destinationImageFallback) {
            setImageSource(destinationImageFallback);
          }
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(255,255,255,0.30),transparent_24%),radial-gradient(circle_at_82%_12%,rgba(251,191,36,0.24),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.10)_42%,rgba(15,23,42,0.58)_100%)] transition duration-300 group-hover:bg-[radial-gradient(circle_at_24%_18%,rgba(255,255,255,0.36),transparent_24%),radial-gradient(circle_at_82%_12%,rgba(251,191,36,0.30),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.08)_42%,rgba(15,23,42,0.52)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-fuchsia-950/55 via-violet-950/18 to-transparent" />
      <div className="absolute -right-14 -top-14 h-32 w-32 rounded-full bg-white/30 blur-2xl transition duration-500 group-hover:scale-125" />
      <div className="absolute -bottom-12 left-8 h-28 w-40 rounded-full bg-amber-300/28 blur-2xl transition duration-500 group-hover:bg-amber-200/40" />

      <div className="relative flex h-full min-h-[20.5rem] flex-col justify-between sm:min-h-[22.5rem]">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-white/34 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white shadow-sm ring-1 ring-white/50 backdrop-blur-md">
            {country}
          </span>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/34 text-lg font-black shadow-sm ring-1 ring-white/50 backdrop-blur-md transition group-hover:bg-white group-hover:text-violet-700">
            →
          </span>
        </div>

        <div className="rounded-3xl border border-white/18 bg-slate-950/18 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-[2px] transition duration-300 group-hover:border-white/32 group-hover:bg-slate-950/12">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-amber-100">
            {tag}
          </p>
          <h3 className="text-3xl font-black tracking-tight drop-shadow-md">
            {name}
          </h3>
          <p className="mt-2 text-sm font-semibold leading-5 text-white/95 drop-shadow-sm">
            {subtitle}
          </p>
          <span className="mt-4 inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-violet-700 shadow-lg shadow-slate-950/15 transition group-hover:bg-amber-100 group-hover:text-violet-900">
            Book this trip
          </span>
        </div>
      </div>
    </Link>
  );
}
