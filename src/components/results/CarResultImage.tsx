"use client";

import Image from "next/image";
import { Car, Truck } from "lucide-react";
import { useState } from "react";
import type { CarCategory } from "@/lib/cars/types";

type CarResultImageProps = {
  imageUrl?: string;
  imageAlt: string;
  modelName: string;
  category: CarCategory;
};

export function CarResultImage({ imageUrl, imageAlt, modelName, category }: CarResultImageProps) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const hasImage = Boolean(imageUrl && failedUrl !== imageUrl);
  const FallbackIcon = category === "van" ? Truck : Car;

  if (!hasImage) {
    return (
      <div className="relative flex h-full min-h-[210px] w-full items-center justify-center" role="img" aria-label={`${modelName} vehicle image unavailable`}>
        <div className="absolute h-32 w-32 rounded-full bg-white/70 blur-sm" aria-hidden="true" />
        <div className="relative flex flex-col items-center gap-2 text-[#315A7D]">
          <FallbackIcon className="h-20 w-20" strokeWidth={1.25} aria-hidden="true" />
          <span className="text-xs font-semibold">Vehicle image unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={imageUrl!}
      alt={imageAlt}
      fill
      sizes="(min-width: 1280px) 240px, (min-width: 768px) 220px, 100vw"
      quality={92}
      className="object-contain p-4 sm:p-5"
      onError={() => setFailedUrl(imageUrl)}
    />
  );
}
