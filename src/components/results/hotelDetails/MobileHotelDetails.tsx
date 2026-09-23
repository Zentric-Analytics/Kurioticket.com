"use client";

import Image from "next/image";
import { ArrowLeft, Bed, CalendarDays, ChevronLeft, ChevronRight, Heart, MapPin, Minus, Plus, Users, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { HotelAmenityList } from "../HotelAmenityList";
import { RelatedHotelsSection } from "./RelatedHotelsSection";
import { buildHotelMapEmbedUrl, buildGoogleHotelStreetViewEmbedUrl } from "@/lib/hotels/hotelMap";
import type { StandaloneHotelDetailsProps } from "./StandaloneHotelDetails";
import { formatMobileHotelPrice, mobileHotelAbout, mobileHotelAmenityGroups, mobileHotelStay } from "./mobileHotelDetailsPresentation";
import styles from "./HotelDetailsMobile.module.css";

type Tab = "rates" | "overview" | "reviews";
type Overlay = "gallery" | "photo" | "amenities" | "stay" | "rooms" | "map" | null;

function DetailsDialog({ title, onClose, children, full = false, back }: { title: string; onClose: () => void; children: ReactNode; full?: boolean; back?: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => { dialog?.close(); document.body.style.overflow = overflow; opener?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className={`${styles.dialog} ${full ? styles.fullDialog : ""}`} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.dialogSurface}>
      <header className={styles.dialogHeader}>
        {back ? <button type="button" aria-label="Back to all photos" onClick={back}><ArrowLeft size={24} /></button> : null}
        <h2>{title}</h2><button type="button" aria-label={`Close ${title}`} onClick={onClose}><X size={22} /></button>
      </header>
      {children}
    </div>
  </dialog>;
}

export function MobileHotelDetails(props: StandaloneHotelDetailsProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("rates");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [mapView, setMapView] = useState<"map" | "streetview">("map");
  const [shareStatus, setShareStatus] = useState("");
  const [handoffError, setHandoffError] = useState("");
  const [pending, setPending] = useState(false);
  const [selectedId, setSelectedId] = useState("kurioticket");
  const gallery = props.galleryProps;
  const hero = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabsShell = useRef<HTMLDivElement>(null);
  const [tabsPinned, setTabsPinned] = useState(false);
  const offsets = useRef<Partial<Record<Tab, number>>>({ rates: 0 });
  const context = props.relatedSearchContext;
  const stay = mobileHotelStay(context);
  const [checkIn, setCheckIn] = useState(context?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(context?.checkOut ?? "");
  const [guests, setGuests] = useState(Number(context?.guests) || 1);
  const [rooms, setRooms] = useState(Number(context?.rooms) || 1);
  function openStay() {
    setCheckIn(context?.checkIn ?? ""); setCheckOut(context?.checkOut ?? "");
    setGuests(Number(context?.guests) || 1); setRooms(Number(context?.rooms) || 1);
    setOverlay("stay");
  }
  const property = props.propertyDetails;
  const location = props.locationDetails ?? property;
  const mapOptions = location ? { hotelName: props.hotelName, propertyDetails: location, googleMapsEmbedApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY } : null;
  const mapUrl = mapOptions ? buildHotelMapEmbedUrl(mapOptions) : null;
  const streetUrl = mapOptions ? buildGoogleHotelStreetViewEmbedUrl(mapOptions) : null;
  const offers = [
    ...(props.roomChoices.length ? [{ id: "kurioticket", providerName: "Kurioticket", providerLogoUrl: "/brand/kurioticket-logo-primary-light-bg.svg", nightlyPrice: props.nightlyDisplayPrice?.formatted ?? props.labels.priceUnavailable, action: { kind: "internal-room-flow" as const } }] : []),
    ...(props.onProviderOfferHandoff ? props.providerOffers ?? [] : []),
  ];
  const selected = offers.find(offer => offer.id === selectedId) ?? offers[0];
  const total = formatMobileHotelPrice(props.totalDisplayPrice, props.labels.priceUnavailable);
  const nightly = formatMobileHotelPrice(props.nightlyDisplayPrice, props.labels.priceUnavailable);

  useEffect(() => {
    // Preview reserves a separate 72px row for the fixed hero actions when tabs pin.
    const updatePinned = () => setTabsPinned((tabsShell.current?.getBoundingClientRect().top ?? 1) <= 0);
    updatePinned();
    window.addEventListener("scroll", updatePinned, { passive: true });
    window.addEventListener("resize", updatePinned);
    return () => {
      window.removeEventListener("scroll", updatePinned);
      window.removeEventListener("resize", updatePinned);
    };
  }, []);

  useEffect(() => {
    const pager = hero.current;
    if (!pager) return;
    const index = gallery.usableIndices.indexOf(gallery.activeIndex);
    if (index >= 0 && Math.abs(pager.scrollLeft - index * pager.clientWidth) > pager.clientWidth / 2) pager.scrollTo({ left: index * pager.clientWidth });
  }, [gallery.activeIndex, gallery.usableIndices]);

  function selectTab(next: Tab) {
    if (next === tab) return;
    offsets.current[tab] = window.scrollY;
    const target = offsets.current[next] ?? window.scrollY;
    setTab(next);
    requestAnimationFrame(() => window.scrollTo({ top: target, behavior: "instant" }));
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: props.hotelName, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); setShareStatus("Link copied"); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setShareStatus("Unable to share. Please try again.");
    }
  }

  async function viewDeal() {
    if (!selected || pending) return;
    if (selected.action.kind === "internal-room-flow") { setOverlay("rooms"); return; }
    setPending(true); setHandoffError("");
    try {
      await props.onProviderOfferHandoff?.(selected.action.providerOfferId);
    }
    catch { setHandoffError("Unable to open provider. Please refresh and try again."); }
    finally { setPending(false); }
  }

  const facts = property ? [property.neighbourhood ? `${property.neighbourhood} neighborhood` : "", property.businessSuitable ? "Work-friendly property" : "", property.familySuitable ? "Family-friendly" : "", property.accessibility?.length ? "Accessibility details available" : ""].filter(Boolean) : [];
  const secondaryAddress = location ? [location.neighbourhood, location.city, location.country].filter(part => part && !location.streetAddress.toLowerCase().includes(part.toLowerCase())).join(", ") : "";

  return <div className={styles.details} data-mobile-hotel-details>
    <div className={styles.heroShell}>
      <div ref={hero} className={styles.hero} data-mobile-hotel-hero onScroll={event => {
        const pager = event.currentTarget;
        const index = Math.round(pager.scrollLeft / pager.clientWidth);
        const imageIndex = gallery.usableIndices[index];
        if (imageIndex !== undefined && Math.abs(pager.scrollLeft - index * pager.clientWidth) < 2 && imageIndex !== gallery.activeIndex) gallery.onSelectImage(imageIndex);
      }} onPointerDown={event => { touchStart.current = { x: event.clientX, y: event.clientY }; moved.current = false; }} onPointerMove={event => {
        if (touchStart.current && Math.hypot(event.clientX - touchStart.current.x, event.clientY - touchStart.current.y) > 8) moved.current = true;
      }}>
        {gallery.usableIndices.length ? gallery.usableIndices.map((index, position) => <button type="button" key={gallery.displayCandidates[index]} aria-label={`Open photo gallery for ${props.hotelName} from photo ${position + 1} of ${gallery.usableIndices.length}`} onClick={() => { if (!moved.current) { gallery.onSelectImage(index); setOverlay("gallery"); } }}>
          <Image src={gallery.displayCandidates[index]} alt={`${props.hotelName} photo ${position + 1}`} fill sizes="100vw" className={styles.cover} priority={position === 0} onError={() => gallery.onImageError(gallery.displayCandidates[index])} />
        </button>) : <div className={styles.emptyHero}>{gallery.imageUnavailableText}</div>}
      </div>
      {gallery.usableIndices.length > 0 ? <span className={styles.photoCount}>{gallery.activePosition} / {gallery.usableIndices.length}</span> : null}
      <a href={props.resultsHref} aria-label="Back to hotel results" className={styles.back}><ArrowLeft size={25} strokeWidth={2.2} /></a>
      <div className={styles.actions}>
        <button type="button" aria-label={props.savedHotelLabel} aria-pressed={props.isSaved} onClick={props.onSave}><Heart size={22} strokeWidth={2} fill={props.isSaved ? "#E92D55" : "none"} color={props.isSaved ? "#E92D55" : "#334155"} /></button>
        <button type="button" aria-label={`Share ${props.hotelName}`} onClick={() => void share()}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" /></svg></button>
      </div>
    </div>
    <header className={styles.identity}>
      <h1>{props.hotelName}</h1>
      {props.starRating ? <p className={styles.stars} aria-label={props.starRatingAriaLabel}>{"★".repeat(props.starRating)}</p> : null}
      {props.reviewScore && props.reviewCountText ? <p className={styles.reviewSummary}><Users size={18} /><strong>{props.reviewLabel} {props.reviewScore}</strong><span> · {props.reviewCountText}</span></p> : null}
    </header>
    <div ref={tabsShell} className={styles.tabs} data-pinned={tabsPinned} role="tablist" aria-label="Hotel details">
      {(["rates", "overview", "reviews"] as const).map((item, index) => <button key={item} ref={element => { tabRefs.current[index] = element; }} id={`mobile-hotel-${item}-tab`} role="tab" type="button" aria-selected={tab === item} aria-controls={`mobile-hotel-${item}-panel`} tabIndex={tab === item ? 0 : -1} onClick={() => selectTab(item)} onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3;
        selectTab((["rates", "overview", "reviews"] as const)[next]); tabRefs.current[next]?.focus({ preventScroll: true });
      }}>{item[0].toUpperCase() + item.slice(1)}</button>)}
    </div>
    <div id={`mobile-hotel-${tab}-panel`} role="tabpanel" aria-labelledby={`mobile-hotel-${tab}-tab`} className={styles.panel}>
      {tab === "rates" ? <section className={styles.rates}>
        <p>{[stay.dates, stay.nights].filter(Boolean).join(" · ")}</p>
        <div role="radiogroup" aria-label="Hotel rates" className={styles.rateList}>
          {offers.map(offer => <label key={offer.id} className={styles.rate} data-selected={selected?.id === offer.id}>
            <input type="radio" name="mobile-hotel-rate" aria-label={`Select ${offer.providerName} offer`} checked={selected?.id === offer.id} onChange={() => setSelectedId(offer.id)} />
            <span className={styles.rateTop}>{offer.providerLogoUrl ? <Image src={offer.providerLogoUrl} alt={`${offer.providerName} logo`} width={132} height={30} /> : <strong>{offer.providerName}</strong>}<span className={styles.radio} aria-hidden="true">{selected?.id === offer.id ? <i /> : null}</span></span>
            <span className={styles.rateBottom}><span>per night</span><strong title={props.nightlyDisplayPrice?.ariaLabel}>{offer.id === "kurioticket" ? nightly : offer.nightlyPrice}</strong></span>
          </label>)}
          {!offers.length ? <div className={styles.noRates}><h2>No rates available</h2><p>Refresh your search for current prices and availability.</p><a href={props.resultsHref}>Back to hotel results</a></div> : null}
        </div>
        {handoffError ? <p role="alert">{handoffError}</p> : null}
      </section> : null}
      {tab === "overview" ? <>
        <button type="button" className={styles.stay} onClick={openStay} aria-label="Edit stay dates, rooms and guests"><CalendarDays size={22} /><span><strong>{stay.dates}</strong><span>{stay.occupancy}</span></span></button>
        <section className={styles.section}><h2>About this hotel</h2><p>{mobileHotelAbout(props.hotelName, property, props.starRating)}</p></section>
        <section className={styles.section}><h2>Location</h2>
          {location ? <><div className={styles.address}><span><MapPin size={18} strokeWidth={1.3} /></span><div><strong>{location.streetAddress}</strong><p>{secondaryAddress}</p></div></div>
            <div className={styles.mapTabs} role="tablist" aria-label="Location views">{(["map", "streetview"] as const).map(view => <button type="button" key={view} role="tab" aria-selected={mapView === view} onClick={() => setMapView(view)}>{view === "map" ? "Map" : "Street View"}</button>)}</div>
            <div className={styles.map}>
              {(mapView === "map" ? mapUrl : streetUrl) ? <iframe title={`${mapView === "map" ? "Map" : "Street View"} for ${props.hotelName}`} src={(mapView === "map" ? mapUrl : streetUrl)!} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /> : <p>{mapView === "map" ? "Map preview unavailable" : "Street View unavailable"}</p>}
              {mapView === "map" && mapUrl ? <button type="button" aria-label={`Open full map for ${props.hotelName}`} className={styles.mapOpener} onClick={() => setOverlay("map")} /> : null}
            </div><h3>Why this location works</h3>{facts.length ? <ul className={styles.facts}>{facts.map(fact => <li key={fact}>{fact}</li>)}</ul> : <p>Location fit details are limited to the verified address and map.</p>}</> : <p>Verified location details are not available for this property yet.</p>}
        </section>
        <section className={styles.section}><h2>Popular amenities</h2><HotelAmenityList items={props.amenityItems.slice(0, 4)} t={() => ""} className={styles.amenities} />{props.amenityItems.length ? <button className={styles.textButton} type="button" onClick={() => setOverlay("amenities")}>See all amenities</button> : <p>Property highlights are not available yet.</p>}</section>
        <section className={styles.section}><h2>Room &amp; comfort</h2>{[property?.roomSummary, property?.bedSummary].filter(Boolean).map(value => <p className={styles.roomFact} key={value}><Bed size={18} strokeWidth={1.3} />{value}</p>)}{!property?.roomSummary && !property?.bedSummary ? <p>Room details are confirmed when you choose a room.</p> : null}</section>
        <section className={styles.section}><h2>Accessibility</h2>{property?.accessibility?.length ? <ul className={styles.facts}>{property.accessibility.map(detail => <li key={detail}>{detail}</li>)}</ul> : <p>Specific accessibility features should be confirmed before booking.</p>}</section>
        <RelatedHotelsSection mobilePreview hotels={props.relatedHotels} city={property?.city || context?.destination || ""} searchContext={context} labels={{ heading: props.labels.moreHotelsIn, viewHotel: props.labels.viewHotel, pricePerNight: props.labels.pricePerNight, estimatedStayTotal: props.labels.estimatedStayTotal, priceUnavailable: props.labels.priceUnavailable, imageUnavailable: props.labels.imageUnavailable, imageAlt: props.labels.imageAlt, nearLocation: props.labels.nearLocation, starHotelAria: props.labels.starHotelAria }} />
      </> : null}
      {tab === "reviews" ? <section className={styles.reviews} aria-label="Guest reviews" data-hotel-reviews-section>{props.reviewScore && props.reviewCountText ? <div className={styles.reviewCard}><div className={styles.reviewScore}><strong>{props.reviewScore.split("/")[0].trim()}</strong><span>/{props.mobileReviewScale ?? 10}</span></div><div className={styles.reviewMeta}><h2>{props.reviewLabel}</h2><p>{props.reviewCountText}</p>{props.reviewSource ? <small>Source: {props.reviewSource}</small> : null}</div></div> : <><h2>Guest reviews</h2><p>Verified guest reviews are not connected for this property yet.</p></>}</section> : null}
    </div>
    {selected ? <section className={styles.dock} data-mobile-hotel-stay-dock><div><strong title={props.totalDisplayPrice?.ariaLabel}>{total}</strong><span>Stay total</span></div><button type="button" onClick={() => void viewDeal()} disabled={pending}>{pending ? "Opening…" : "View deal"}</button></section> : null}
    <span role="status" className="sr-only">{shareStatus}</span>

    {overlay ? <DetailsDialog title={overlay === "gallery" ? "Photos" : overlay === "photo" ? `${gallery.activePosition} / ${gallery.usableIndices.length}` : overlay === "amenities" ? "All amenities" : overlay === "stay" ? "Your stay" : overlay === "map" ? "Location" : "Room options"} full={overlay === "gallery" || overlay === "photo" || overlay === "map"} back={overlay === "photo" ? () => setOverlay("gallery") : undefined} onClose={() => setOverlay(null)}>
      {overlay === "gallery" ? <div className={styles.galleryGrid}>{gallery.usableIndices.map((index, position) => <button type="button" key={index} onClick={() => { gallery.onSelectImage(index); setOverlay("photo"); }} aria-label={`View photo ${position + 1}`}><Image src={gallery.displayCandidates[index]} alt={`${props.hotelName} photo ${position + 1}`} fill sizes={position % 3 === 0 ? "100vw" : "50vw"} className={styles.cover} onError={() => gallery.onImageError(gallery.displayCandidates[index])} /></button>)}</div> : null}
      {overlay === "photo" ? <div className={styles.viewer} onTouchStart={event => { touchStart.current = {x:event.touches[0].clientX,y:event.touches[0].clientY}; }} onTouchEnd={event => { const start = touchStart.current; const touch = event.changedTouches[0]; if (start && Math.abs(touch.clientX-start.x)>40 && Math.abs(touch.clientY-start.y)<80) { if(touch.clientX>start.x) gallery.onPrevious(); else gallery.onNext(); } touchStart.current=null; }}><Image src={gallery.activeUrl} alt={gallery.imageAlt} fill sizes="100vw" style={{ objectFit: "contain" }} /><button type="button" aria-label="Previous photo" onClick={gallery.onPrevious}><ChevronLeft /></button><button type="button" aria-label="Next photo" onClick={gallery.onNext}><ChevronRight /></button></div> : null}
      {overlay === "amenities" ? <div className={styles.sheetBody}><>{mobileHotelAmenityGroups(props.amenityItems).map(group => <section key={group.title} className={styles.amenityGroup}><h3>{group.title}</h3><HotelAmenityList items={group.items} t={() => ""} className={styles.amenities} /></section>)}</></div> : null}
      {overlay === "map" && mapUrl ? <iframe className={styles.fullMap} title={`Full map for ${props.hotelName}`} src={mapUrl} referrerPolicy="strict-origin-when-cross-origin" /> : null}
      {overlay === "rooms" ? <div className={styles.sheetBody}><p>Indicative planning choices. Final prices, availability, and terms are confirmed before booking.</p>{props.roomChoices.map(room => <article className={styles.room} key={room.id}><h3>{room.name}</h3><p>{room.details}</p><strong>{room.total} total</strong><p>{room.nightly}</p><small>Planning option · indicative price</small></article>)}</div> : null}
      {overlay === "stay" ? <form className={styles.sheetBody} onSubmit={event => { event.preventDefault(); const url = new URL(window.location.href); url.searchParams.set("checkIn", checkIn); url.searchParams.set("checkOut", checkOut); url.searchParams.set("guests", String(guests)); url.searchParams.set("rooms", String(rooms)); setOverlay(null); router.replace(`${url.pathname}${url.search}`, {scroll:false}); }}>
        <div className={styles.dateFields}><label>Check-in<input type="date" required value={checkIn} onChange={event => setCheckIn(event.target.value)} /></label><label>Check-out<input type="date" required min={checkIn} value={checkOut} onChange={event => setCheckOut(event.target.value)} /></label></div>
        {([{label:"Guests",value:guests,set:setGuests,max:12},{label:"Rooms",value:rooms,set:setRooms,max:6}]).map(counter => <div className={styles.counterRow} key={counter.label}><strong>{counter.label}</strong><button type="button" aria-label={`Decrease ${counter.label.toLowerCase()}`} disabled={counter.value<=1} onClick={() => counter.set(counter.value-1)}><Minus size={18} /></button><span>{counter.value}</span><button type="button" aria-label={`Increase ${counter.label.toLowerCase()}`} disabled={counter.value>=counter.max} onClick={() => counter.set(counter.value+1)}><Plus size={18} /></button></div>)}
        <button className={styles.done} type="submit" disabled={!checkIn || !checkOut || checkOut<=checkIn}>Done</button>
      </form> : null}
    </DetailsDialog> : null}
  </div>;
}
