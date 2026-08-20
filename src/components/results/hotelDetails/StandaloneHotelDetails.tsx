"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Heart,
  Info,
  Laptop,
  MapPin,
  MoreHorizontal,
  Share2,
  Sparkles,
  Users,
  UtensilsCrossed,
  Wifi,
  Wine,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { HotelAmenityPresentationItem } from "@/components/results/hotelAmenityPresentation";
import type { PublicHotelPropertyDetails, PublicHotelResult } from "@/lib/types";
import { HotelDetailsGallery } from "@/components/results/hotelDetails/HotelDetailsGallery";
import { HotelLocationSection } from "@/components/results/hotelDetails/HotelLocationSection";
import { RelatedHotelsSection } from "@/components/results/hotelDetails/RelatedHotelsSection";
import type { HotelDetailsSearchContext } from "@/components/results/hotelDetails/hotelDetailsPresentation";

type DisplayPrice = {
  formatted: string;
  title?: string;
  ariaLabel: string;
  providerFormatted: string;
  isConvertedEstimate: boolean;
};

type RoomChoice = {
  id: string;
  name: string;
  details: string;
  nightly: string;
  total: string;
};

type GalleryProps = Parameters<typeof HotelDetailsGallery>[0];

export type StandaloneHotelDetailsProps = {
  hotelName: string;
  starRating: number | null;
  starRatingAriaLabel: string;
  locationParts: string[];
  propertyDetails: PublicHotelPropertyDetails | null;
  relatedHotels: PublicHotelResult[];
  relatedSearchContext?: HotelDetailsSearchContext;
  amenityItems: HotelAmenityPresentationItem[];
  isSaved: boolean;
  savedHotelLabel: string;
  saveText: string;
  onSave: () => void;
  resultsHref: string;
  staySummary: { dateText: string; occupancyText: string; nightText: string } | null;
  totalDisplayPrice: DisplayPrice | null;
  nightlyDisplayPrice: DisplayPrice | null;
  estimatedTotalText: string;
  perNightText: string;
  taxesText: string;
  planningPriceText: string;
  roomChoices: RoomChoice[];
  galleryProps: GalleryProps;
  labels: {
    share: string;
    shared: string;
    more: string;
    less: string;
    about: string;
    location: string;
    directions: string;
    yourStay: string;
    edit: string;
    viewRooms: string;
    roomSupport: string;
    roomTitle: string;
    closeRooms: string;
    roomTerms: string;
    moreHotelsIn: string;
    viewHotel: string;
    pricePerNight: string;
    estimatedStayTotal: string;
    priceUnavailable: string;
    imageUnavailable: string;
    imageAlt: string;
    nearLocation: string;
    starHotelAria: string;
  };
};

function getAmenityIcon(item: HotelAmenityPresentationItem): LucideIcon {
  if (item.iconKey === "wifi") return Wifi;
  if (item.iconKey === "restaurant") return UtensilsCrossed;
  if (item.iconKey === "workspace") return Laptop;
  if (/bar|lounge/i.test(item.label)) return Wine;
  return Sparkles;
}

export function StandaloneHotelDetails(props: StandaloneHotelDetailsProps) {
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [shareComplete, setShareComplete] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const roomOptionsButtonRef = useRef<HTMLButtonElement>(null);
  const roomDialogRef = useRef<HTMLElement>(null);
  const primaryAmenities = props.amenityItems.slice(0, 4);
  const description = props.propertyDetails?.description || "";
  const canExpandDescription = description.length > 130;

  useEffect(() => {
    if (!roomsOpen) return;

    const dialog = roomDialogRef.current;
    const trigger = roomOptionsButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      );
    const focusFrame = window.requestAnimationFrame(() => {
      focusable()[0]?.focus();
    });

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setRoomsOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDialogKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => trigger?.focus());
    };
  }, [roomsOpen]);

  async function sharePage() {
    const shareData = { title: props.hotelName, url: window.location.href };
    if (navigator.share) await navigator.share(shareData);
    else await navigator.clipboard.writeText(window.location.href);
    setShareComplete(true);
    window.setTimeout(() => setShareComplete(false), 1800);
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_334px] lg:items-start lg:gap-7" data-standalone-hotel-details>
      <div className="min-w-0">
        <article className="min-w-0 rounded-[17px] border border-slate-200/80 bg-white p-5 shadow-[0_5px_24px_rgba(15,23,42,0.045)] sm:p-6">
        <header className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5">
              <h1 className="break-words text-[26px] font-extrabold leading-tight tracking-[-0.025em] text-slate-950 lg:text-[30px]">{props.hotelName}</h1>
              {props.starRating ? <span aria-label={props.starRatingAriaLabel} className="whitespace-nowrap text-[15px] tracking-[0.08em] text-amber-500"><span aria-hidden="true">{"★".repeat(props.starRating)}</span></span> : null}
            </div>
            {props.locationParts.length ? <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[13px] font-medium text-slate-600"><MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />{props.locationParts.map((part, index) => <span key={part}>{index ? <span aria-hidden="true"> · </span> : null}{part}</span>)}</p> : null}
          </div>
          <div className="flex shrink-0 gap-3">
            <button type="button" aria-pressed={props.isSaved} aria-label={props.savedHotelLabel} onClick={props.onSave} className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"><Heart className="h-[17px] w-[17px]" fill={props.isSaved ? "currentColor" : "none"} aria-hidden="true" />{props.saveText}</button>
            <button type="button" aria-label={props.labels.share} onClick={() => void sharePage()} className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"><Share2 className="h-[17px] w-[17px]" aria-hidden="true" />{shareComplete ? props.labels.shared : props.labels.share}</button>
          </div>
        </header>

        <HotelDetailsGallery {...props.galleryProps} embedded layout="mosaic" />

        {primaryAmenities.length ? <div className="mt-3 overflow-hidden rounded-[11px] border border-slate-200 bg-white" data-hotel-amenities-strip><div className="grid min-h-[52px] grid-cols-2 sm:grid-cols-5">{primaryAmenities.map((item) => { const Icon = getAmenityIcon(item); return <div key={item.key} className="flex items-center justify-center gap-2 border-slate-200 px-2 text-xs font-semibold text-slate-800 sm:border-e last:border-e-0"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /><span className="truncate">{item.label}</span></div>; })}<button type="button" aria-expanded={amenitiesExpanded} onClick={() => setAmenitiesExpanded((value) => !value)} className="focus-ring col-span-2 flex items-center justify-center gap-2 border-t border-slate-200 px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 sm:col-span-1 sm:border-t-0"><MoreHorizontal className="h-5 w-5" aria-hidden="true" />{props.labels.more}</button></div>{amenitiesExpanded ? <ul className="grid grid-cols-1 gap-2 border-t border-slate-200 p-4 text-sm text-slate-700 sm:grid-cols-2">{props.amenityItems.map((item) => <li key={item.key}>{item.label}</li>)}</ul> : null}</div> : null}

        {description ? <section className="mt-5" aria-labelledby="hotel-about-heading"><h2 id="hotel-about-heading" className="text-[17px] font-bold text-slate-950">{props.labels.about}</h2><p className={`mt-2 text-[13px] leading-5 text-slate-600 ${descriptionExpanded ? "" : "line-clamp-2"}`}>{description}</p>{canExpandDescription ? <button type="button" aria-expanded={descriptionExpanded} onClick={() => setDescriptionExpanded((value) => !value)} className="focus-ring mt-1 inline-flex items-center gap-1 text-xs font-bold text-blue hover:underline">{descriptionExpanded ? props.labels.less : props.labels.more}{descriptionExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}</button> : null}</section> : null}

        {props.propertyDetails ? <HotelLocationSection hotelName={props.hotelName} propertyDetails={props.propertyDetails} locationLabel={props.labels.location} directionsLabel={props.labels.directions} /> : null}
        </article>

        <RelatedHotelsSection
          hotels={props.relatedHotels}
          city={props.propertyDetails?.city || ""}
          searchContext={props.relatedSearchContext}
          labels={{
            heading: props.labels.moreHotelsIn,
            viewHotel: props.labels.viewHotel,
            pricePerNight: props.labels.pricePerNight,
            estimatedStayTotal: props.labels.estimatedStayTotal,
            priceUnavailable: props.labels.priceUnavailable,
            imageUnavailable: props.labels.imageUnavailable,
            imageAlt: props.labels.imageAlt,
            nearLocation: props.labels.nearLocation,
            starHotelAria: props.labels.starHotelAria,
          }}
        />
      </div>

      <aside className="min-w-0 self-start" data-standalone-stay-summary>
        <section className="rounded-[17px] border border-slate-200/80 bg-white p-5 shadow-[0_5px_24px_rgba(15,23,42,0.045)] sm:p-6" aria-labelledby="your-stay-heading">
          <h2 id="your-stay-heading" className="text-xl font-extrabold text-slate-950">{props.labels.yourStay}</h2>
          {props.staySummary ? <div className="mt-5 space-y-5"><div className="flex gap-3"><CalendarDays className="mt-0.5 h-[18px] w-[18px] shrink-0 text-slate-700" aria-hidden="true" /><div><p className="text-[13px] font-semibold leading-5 text-slate-800">{props.staySummary.dateText}</p><p className="mt-0.5 text-xs text-slate-500">{props.staySummary.nightText}</p></div></div><div className="flex min-h-11 items-center gap-3"><Users className="h-[18px] w-[18px] shrink-0 text-slate-700" aria-hidden="true" /><p className="min-w-0 flex-1 text-[13px] font-semibold text-slate-800">{props.staySummary.occupancyText}</p><a href={props.resultsHref} className="focus-ring inline-flex min-h-11 items-center text-xs font-bold text-blue hover:underline">{props.labels.edit}</a></div></div> : null}
          <div className="my-5 border-t border-slate-200" />
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">{props.estimatedTotalText}<Info className="h-3.5 w-3.5" aria-hidden="true" /></p>
          {props.totalDisplayPrice && props.nightlyDisplayPrice ? <><p className="mt-1.5 text-[36px] font-extrabold leading-tight tracking-[-0.025em] text-slate-950" dir="ltr" title={props.totalDisplayPrice.title} aria-label={props.totalDisplayPrice.ariaLabel}>{props.totalDisplayPrice.formatted}</p><p className="mt-2 text-[13px] font-semibold text-slate-600" title={props.nightlyDisplayPrice.title}>{props.perNightText.replace("{{price}}", props.nightlyDisplayPrice.formatted)}</p><p className="mt-1 text-xs leading-5 text-slate-500">{props.taxesText || props.planningPriceText}</p></> : <p className="mt-2 text-sm font-semibold text-slate-700">{props.planningPriceText}</p>}
          <button ref={roomOptionsButtonRef} type="button" disabled={!props.roomChoices.length} onClick={() => setRoomsOpen(true)} className="focus-ring mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-blue px-4 text-sm font-bold text-white hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-50">{props.labels.viewRooms}</button>
          <p className="mt-2 text-center text-[11px] leading-4 text-slate-500">{props.labels.roomSupport}</p>
        </section>
      </aside>

      {roomsOpen ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRoomsOpen(false); }}><section ref={roomDialogRef} role="dialog" aria-modal="true" aria-labelledby="room-options-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 id="room-options-title" className="text-xl font-extrabold text-slate-950">{props.labels.roomTitle}</h2><p className="mt-1 text-sm text-slate-600">{props.planningPriceText}</p></div><button type="button" aria-label={props.labels.closeRooms} onClick={() => setRoomsOpen(false)} className="focus-ring rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" aria-hidden="true" /></button></div><div className="mt-5 space-y-3">{props.roomChoices.map((room) => <article key={room.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold text-slate-950">{room.name}</h3><p className="mt-1 text-sm text-slate-600">{room.details}</p></div><div className="shrink-0 text-right"><p className="font-bold text-slate-950">{room.total}</p><p className="text-xs text-slate-500">{room.nightly}</p></div></div><p className="mt-3 flex items-center gap-2 text-xs text-slate-600"><Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />{props.labels.roomTerms}</p></article>)}</div></section></div> : null}
    </div>
  );
}
