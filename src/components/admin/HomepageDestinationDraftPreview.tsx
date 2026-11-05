"use client";

import { useState } from "react";
import { ImageIcon, Plane } from "lucide-react";

function permittedPreviewImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const image = value.trim();
  if (/^\/(?!\/)[^\s]*$/.test(image) || /^https?:\/\/[^\s]+$/i.test(image)) return image;
  return null;
}

function DraftImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
      {src && !failed ? (
        // CMS editors accept already-managed public image URLs, including external sources.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500">
          <ImageIcon aria-hidden="true" className="h-7 w-7 text-slate-400" />
          <span className="text-[12px]">{failed ? "Image could not be loaded" : "No preview image"}</span>
        </div>
      )}
    </div>
  );
}

export function HomepageDestinationDraftPreview({
  payload,
  marketName,
  order,
  version,
  publishedVersion,
  unpublishedLabel,
  unsaved,
}: {
  payload: Record<string, unknown>;
  marketName: string;
  order: string;
  version?: number;
  publishedVersion?: number | null;
  unpublishedLabel: string | null;
  unsaved: boolean;
}) {
  const city = String(payload.city || "").trim() || "Destination city";
  const country = String(payload.country || "").trim() || "Country";
  const origin = String(payload.originCode || "").trim();
  const destination = String(payload.destinationCode || "").trim();
  const imageAlt = String(payload.imageAlt || "").trim() || (city + ", " + country);
  const imageUrl = permittedPreviewImage(payload.image);

  return (
    <aside className="h-fit min-w-0">
      <h2 className="text-[14px] font-semibold text-[#111827]">Draft preview</h2>
      <p className="mt-1 text-[12px] leading-5 text-slate-500">Updates as you edit. This is not the live website.</p>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
        <DraftImage key={imageUrl ?? "no-image"} src={imageUrl} alt={imageAlt} />
        <div className="space-y-3 p-3.5">
          <div>
            <p className="truncate text-[16px] font-semibold leading-6 text-slate-950">{city}</p>
            <p className="text-[13px] text-slate-600">{country}</p>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[12px] font-medium text-slate-700">
            <Plane aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="min-w-0 truncate">{origin || "Origin"} → {destination || "Destination"}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[12px] text-slate-600">
            <span>Market: <strong className="font-medium text-slate-800">{marketName || "Select market"}</strong></span>
            <span>Order: <strong className="font-medium text-slate-800">{order || "0"}</strong></span>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-[12px] leading-5 text-slate-600">
        {typeof version === "number" ? (
          <p>Draft v{version} · Published {publishedVersion ? "v" + publishedVersion : "none"}</p>
        ) : (
          <p>New draft · Not published</p>
        )}
        {unsaved ? (
          <p className="font-medium text-amber-700">Unsaved edits — save the draft to keep these changes.</p>
        ) : typeof version !== "number" || publishedVersion == null ? (
          <p className="text-slate-500">Draft not yet published</p>
        ) : unpublishedLabel ? (
          <p className="font-medium text-amber-700">{unpublishedLabel}</p>
        ) : (
          <p className="text-slate-500">No unpublished changes</p>
        )}
        <p className="text-slate-500">Saving a draft does not publish it. Use Publish to update the public content.</p>
      </div>
    </aside>
  );
}
