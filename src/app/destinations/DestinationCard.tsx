"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const destinationImageFallback =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=92";

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
      className="group relative min-h-[22rem] overflow-hidden rounded-[1.35rem] bg-slate-900 p-5 text-white shadow-lg shadow-slate-200/80 outline-none transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-200/60 focus-visible:ring-4 focus-visible:ring-violet-200 sm:min-h-[24rem]"
      aria-label={`Search flights to ${name}`}
    >
      <Image
        src={imageSource}
        alt={imageAlt}
        fill
        quality={92}
        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover transition duration-700 ease-out group-hover:scale-105"
        style={{ objectPosition: imagePosition }}
        onError={() => {
          if (imageSource !== destinationImageFallback) {
            setImageSource(destinationImageFallback);
          }
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/12 via-slate-950/48 to-slate-950/88 transition duration-300 group-hover:from-slate-950/6 group-hover:via-slate-950/42 group-hover:to-slate-950/90" />

      <div className="relative flex h-full min-h-[19.5rem] flex-col justify-between sm:min-h-[21.5rem]">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white/90 ring-1 ring-white/25 backdrop-blur">
            {country}
          </span>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/18 text-lg font-black ring-1 ring-white/25 backdrop-blur transition group-hover:bg-white group-hover:text-violet-700">
            →
          </span>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70">
            {tag}
          </p>
          <h3 className="text-2xl font-black tracking-tight drop-shadow-sm">
            {name}
          </h3>
          <p className="mt-2 text-sm font-semibold leading-5 text-white/86">
            {subtitle}
          </p>
        </div>
      </div>
    </Link>
  );
}
