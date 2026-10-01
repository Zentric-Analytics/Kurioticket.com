"use client";

import { useRef } from "react";
import { MapPin, X } from "lucide-react";

function googleMapUrl(destination: string) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(`hotels in ${destination}`)}&output=embed&z=13`;
}

export function HotelResultsMapPreview({ destination }: { destination: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const place = destination.trim();

  if (!place) return null;

  return (
    <>
      <div className="relative mb-1 h-[150px] w-full overflow-hidden rounded-lg border border-slate-200 bg-[#e8eef2]" data-hotel-results-map-preview>
        <iframe
          title={`Map preview of ${place}`}
          src={googleMapUrl(place)}
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full border-0"
        />
        <button
          type="button"
          aria-label={`Show hotels in ${place} on map`}
          onClick={() => dialogRef.current?.showModal()}
          className="absolute inset-0 flex cursor-pointer items-end justify-center bg-black/[0.03] pb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0057b8]"
        >
          <span className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#0057b8] px-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(15,23,42,0.22)] transition-colors hover:bg-[#004a9e]">
            <MapPin size={16} aria-hidden="true" />
            Show on map
          </span>
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-label={`Hotels in ${place} on map`}
        className="m-auto h-[min(88dvh,850px)] w-[min(94vw,1200px)] max-w-none overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/60"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4">
            <h2 className="min-w-0 truncate text-base font-semibold">Hotels in {place}</h2>
            <button
              type="button"
              aria-label="Close map"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057b8]"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <iframe
            title={`Google map of hotels in ${place}`}
            src={googleMapUrl(place)}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="min-h-0 w-full flex-1 border-0 bg-slate-100"
            allowFullScreen
          />
        </div>
      </dialog>
    </>
  );
}
