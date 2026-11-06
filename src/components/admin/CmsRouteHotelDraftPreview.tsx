"use client";

import { useState } from "react";
import { Hotel, ImageIcon, Plane } from "lucide-react";

import type { HomepageCmsSection } from "@/lib/adminHomepageCms";

function previewImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (/^\/(?!\/)[^\s]*$/.test(path) || /^https?:\/\/[^\s]+$/i.test(path)) return path;
  return null;
}

function PreviewImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
      {src && !failed ? (
        // CMS-supplied images may be approved remote assets or managed local paths.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
          <ImageIcon aria-hidden="true" className="h-7 w-7 text-slate-400" />
          <span className="text-[12px]">{failed ? "Image could not be loaded" : "No preview image"}</span>
        </div>
      )}
    </div>
  );
}

/** Visual draft summary for the two other homepage CMS content types.
 * Matches the destination preview; it is intentionally non-sticky and never publishes.
 */
export function CmsRouteHotelDraftPreview({
  section,
  payload,
  marketName,
  order,
  version,
  publishedVersion,
  unpublishedLabel,
  unsaved,
}: {
  section: Extract<HomepageCmsSection, "flight-routes" | "hotel-destinations">;
  payload: Record<string, unknown>;
  marketName: string;
  order: string;
  version?: number;
  publishedVersion?: number | null;
  unpublishedLabel: string | null;
  unsaved: boolean;
}) {
  const flight = section === "flight-routes";
  const title = String(flight ? payload.title || "Flight route" : payload.name || "Hotel destination");
  const subtitle = flight
    ? String(payload.originCity || "Origin") + " → " + String(payload.destinationCity || "Destination")
    : String(payload.country || "Country");
  const imageUrl = previewImage(payload.image);
  const imageAlt = String(payload.imageAlt || title).trim();

  return (
    <aside className="h-fit min-w-0">
      <h2 className="text-[14px] font-semibold text-[#111827]">Draft preview</h2>
      <p className="mt-1 text-[12px] leading-5 text-slate-500">Updates as you edit. This is not the live website.</p>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
        <PreviewImage key={imageUrl ?? "no-image"} src={imageUrl} alt={imageAlt} />
        <div className="space-y-3 p-3.5">
          <div>
            <p className="break-words text-[16px] font-semibold leading-6 text-slate-950">{title}</p>
            <p className="mt-1 text-[13px] text-slate-600">{subtitle}</p>
          </div>
          {flight ? (
            <>
              <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[12px] font-medium text-slate-700">
                <Plane aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="min-w-0 break-words">{String(payload.originCode || "Origin")} → {String(payload.destinationCode || "Destination")}</span>
              </div>
              {payload.routeNote ? <p className="whitespace-pre-wrap break-words text-[12px] leading-5 text-slate-600">{String(payload.routeNote)}</p> : null}
            </>
          ) : (
            <div className="flex min-w-0 items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[12px] font-medium text-slate-700">
              <Hotel aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <span className="min-w-0 break-words">
                {String(payload.searchValue || "Destination search")}
                {payload.kind ? <span className="mt-0.5 block text-[11px] font-normal text-slate-500">{String(payload.kind)}</span> : null}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[12px] text-slate-600">
            <span>Market: <strong className="font-medium text-slate-800">{marketName || "Select market"}</strong></span>
            <span>Order: <strong className="font-medium text-slate-800">{order || "1"}</strong></span>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-[12px] leading-5 text-slate-600">
        {typeof version === "number"
          ? <p>Draft v{version} · Published {publishedVersion ? "v" + publishedVersion : "none"}</p>
          : <p>New draft · Not published</p>}
        {unsaved
          ? <p className="font-medium text-amber-700">Unsaved edits — save the draft to keep these changes.</p>
          : publishedVersion == null
            ? <p className="text-slate-500">Draft not yet published</p>
            : unpublishedLabel
              ? <p className="font-medium text-amber-700">{unpublishedLabel}</p>
              : <p className="text-slate-500">No unpublished changes</p>}
        <p className="text-slate-500">Saving a draft does not publish it. Use Publish to update the public content.</p>
      </div>
    </aside>
  );
}
