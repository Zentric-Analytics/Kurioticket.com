"use client";

import Link from "next/link";
import { ArrowLeft, Heart, MapPin, Share2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { StandaloneHotelDetailsProps } from "./StandaloneHotelDetails";
import { HotelDetailsGallery } from "./HotelDetailsGallery";
import { HotelPriceComparisonSection } from "./HotelPriceComparisonSection";
import { DesktopHotelStayEditor } from "./DesktopHotelStayEditor";
import { HotelLocationSection } from "./HotelLocationSection";
import { HotelReviewsSection } from "./HotelReviewsSection";
import { RelatedHotelsSection } from "./RelatedHotelsSection";
import { HotelAmenityList } from "../HotelAmenityList";
import { buildHotelAddress } from "@/lib/hotels/hotelMap";
import { buildKurioticketHotelDetailsProviderOffer, isActionableExternalHotelProviderOffer, resolveHotelBookingContinuation, resolveSelectedHotelProviderOfferId } from "./hotelBookingContinuation";
import { desktopHotelReviewScore } from "./desktopHotelDetailsModel";
import { mobileHotelAbout } from "./mobileHotelDetailsPresentation";
import styles from "./HotelDetailsDesktop.module.css";

const sections = [
  { id: "hotel-overview", label: "Overview" },
  { id: "hotel-compare-prices", label: "Rate" },
  { id: "hotel-reviews", label: "Review" },
] as const;
type DesktopHotelSection = typeof sections[number]["id"];

function DesktopDialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; opener?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className={styles.dialog} aria-label={title} onCancel={event => { event.preventDefault(); close(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
  }}>
    <header className={styles.dialogHeader}><h2>{title}</h2><button type="button" className={styles.iconButton} aria-label={`Close ${title}`} onClick={close}><X size={20} /></button></header>
    {children}
  </dialog>;
}

export function DesktopHotelDetails(props: StandaloneHotelDetailsProps) {
  const [activeSection, setActiveSection] = useState<DesktopHotelSection | null>("hotel-overview");
  const detailsRef = useRef<HTMLDivElement>(null);
  const sectionBarRef = useRef<HTMLDivElement>(null);
  const [sectionBarStuck, setSectionBarStuck] = useState(false);
  const utilityFocusRef = useRef<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [pendingProviderOfferId, setPendingProviderOfferId] = useState<string | null>(null);
  const [providerHandoffError, setProviderHandoffError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState("");
  const [overlay, setOverlay] = useState<"rooms" | null>(null);
  const [allAmenities, setAllAmenities] = useState(false);
  const handoffPending = useRef(false);
  const property = props.propertyDetails;
  const locationProperty = props.locationDetails ?? property;
  const description = mobileHotelAbout(props.hotelName, property, props.starRating);
  const canonicalAddress = locationProperty ? buildHotelAddress(locationProperty) : props.locationParts.join(" · ");
  const internalRoomFlowAvailable = props.roomChoices.length > 0;
  const internalOffer = {
    ...buildKurioticketHotelDetailsProviderOffer({ nightlyPrice: props.nightlyDisplayPrice?.formatted || props.labels.priceUnavailable, nightlyPriceTitle: props.nightlyDisplayPrice?.title, nightlyPriceAriaLabel: props.nightlyDisplayPrice?.ariaLabel, amenities: props.amenityItems }),
    totalPrice: props.totalDisplayPrice?.formatted,
    taxesAndFeesLabel: props.taxesText || props.planningPriceText,
  };
  const externalOffers = props.onProviderOfferHandoff ? (props.providerOffers ?? []).filter(isActionableExternalHotelProviderOffer) : [];
  const offers = [...(internalRoomFlowAvailable ? [internalOffer] : []), ...externalOffers];
  const selectedId = resolveSelectedHotelProviderOfferId({ selectedOfferId, offers, internalRoomFlowAvailable });
  const reviewScore = desktopHotelReviewScore(props.reviewScore, props.mobileReviewScale);
  const context = props.relatedSearchContext;
  const relatedCity = property?.city || context?.destination || "";

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const barBounds = sectionBarRef.current?.getBoundingClientRect();
      const stuck = Boolean(barBounds && barBounds.top <= 0);
      const utilityPlacement = stuck ? "tabs" : "gallery";
      const focusedUtility = document.activeElement;
      if (focusedUtility instanceof HTMLButtonElement && detailsRef.current?.contains(focusedUtility) && focusedUtility.dataset.hotelUtilityAction && focusedUtility.parentElement?.dataset.utilityPlacement !== utilityPlacement) {
        utilityFocusRef.current = focusedUtility.dataset.hotelUtilityAction;
      }
      setSectionBarStuck(stuck);
      const threshold = (barBounds?.height ?? 76) + 24;
      let current: DesktopHotelSection | null = sections[0].id;
      for (const section of sections) {
        if ((document.getElementById(section.id)?.getBoundingClientRect().top ?? Infinity) <= threshold) current = section.id;
      }
      const related = document.getElementById("hotel-related-hotels");
      if (related && related.getBoundingClientRect().top <= threshold) current = null;
      // A short final section may never reach the sticky bar before the page ends.
      if (!related && window.scrollY > 0 && Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1].id;
      setActiveSection(current);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    if (detailsRef.current) observer.observe(detailsRef.current);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (!utilityFocusRef.current) return;
    detailsRef.current?.querySelector<HTMLButtonElement>(`[data-utility-placement="${sectionBarStuck ? "tabs" : "gallery"}"] [data-hotel-utility-action="${utilityFocusRef.current}"]`)?.focus({ preventScroll: true });
    utilityFocusRef.current = null;
  }, [sectionBarStuck]);

  function goToSection(id: string) {
    setActiveSection(sections.find(section => section.id === id)?.id ?? "hotel-overview");
    const target = document.getElementById(id);
    target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    const heading = target?.querySelector<HTMLElement>("h2");
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }

  async function sharePage() {
    try {
      if (navigator.share) await navigator.share({ title: props.hotelName, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); setShareStatus(props.labels.shared); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setShareStatus("Unable to share. Please try again.");
    }
  }

  async function continueOffer(offerId: string, trigger: HTMLButtonElement) {
    if (handoffPending.current) return;
    const decision = resolveHotelBookingContinuation({ selectedOfferId: offerId, offers, internalRoomFlowAvailable });
    setSelectedOfferId(offerId);
    if (decision.kind === "internal-room-flow") { trigger.focus(); setOverlay("rooms"); return; }
    if (decision.kind !== "provider-handoff" || !props.onProviderOfferHandoff) return;
    const providerWindow = window.open("about:blank", "_blank");
    if (providerWindow) providerWindow.opener = null;

    handoffPending.current = true;
    setPendingProviderOfferId(offerId);
    setProviderHandoffError(null);
    try {
      await props.onProviderOfferHandoff(decision.providerOfferId, providerWindow);
    } catch {
      if (providerWindow && !providerWindow.closed) providerWindow.close();
      setProviderHandoffError("We couldn't open this provider offer. Please try again.");
      goToSection("hotel-compare-prices");
    } finally {
      handoffPending.current = false;
      setPendingProviderOfferId(null);
    }
  }

  const utilityActions = (placement: "gallery" | "tabs") => <div className={`${styles.utilityActions} ${placement === "gallery" ? styles.galleryActions : ""}`} data-utility-placement={placement} hidden={placement === "gallery" ? sectionBarStuck : !sectionBarStuck}>
    <button type="button" className={styles.iconButton} data-hotel-utility-action="save" aria-label={props.savedHotelLabel} aria-pressed={props.isSaved} onClick={props.onSave}><Heart size={18} fill={props.isSaved ? "currentColor" : "none"} aria-hidden="true" /></button>
    <button type="button" className={styles.iconButton} data-hotel-utility-action="share" aria-label={props.labels.share} onClick={() => void sharePage()}><Share2 size={18} aria-hidden="true" /></button>
  </div>;

  return <div ref={detailsRef} className={styles.desktop} data-standalone-hotel-details data-desktop-hotel-details>
    <header className={styles.identity}>
      <div className={styles.identityText}>
        <div className={styles.titleRow}><h1>{props.hotelName}</h1>{props.starRating ? <span className={styles.stars} aria-label={props.starRatingAriaLabel}><span aria-hidden="true">{"★".repeat(props.starRating)}</span></span> : null}</div>
        {canonicalAddress ? <button type="button" className={styles.address} onClick={() => goToSection("hotel-location")}><MapPin size={15} aria-hidden="true" />{canonicalAddress}</button> : null}
        {props.reviewScore ? <button type="button" className={styles.reviewIdentity} onClick={() => goToSection("hotel-reviews")}><strong aria-label={reviewScore}>{props.reviewScore}</strong><b>{props.reviewLabel}</b><span>{props.reviewCountText}</span></button> : null}
      </div>
    </header>
    {shareStatus ? <p className={styles.status} role="status">{shareStatus}</p> : null}
    <div className={styles.gallery}>
      <HotelDetailsGallery {...props.galleryProps} embedded layout="desktop" />
      <Link href={props.resultsHref} className={styles.galleryBack} aria-label={props.labels.backToResults} title={props.labels.backToResults} data-standalone-hotel-back-link><ArrowLeft size={20} aria-hidden="true" /></Link>
      {utilityActions("gallery")}
    </div>
    <div ref={sectionBarRef} className={styles.sectionBar} data-desktop-section-bar>
      <nav className={styles.tabs} aria-label="Hotel details sections">
        {sections.map(section => <a key={section.id} href={`#${section.id}`} aria-current={activeSection === section.id ? "location" : undefined} onClick={event => { event.preventDefault(); goToSection(section.id); }}>{section.label}</a>)}
      </nav>
      {utilityActions("tabs")}
    </div>

    <div data-desktop-section="overview">
    <section id="hotel-overview" className={styles.section} aria-labelledby="hotel-overview-heading">
      <h2 id="hotel-overview-heading" tabIndex={-1}>About this hotel</h2>
      <p>{description}</p>
    </section>

    <section id="hotel-amenities" className={styles.section} aria-labelledby="hotel-amenities-heading">
      <h2 id="hotel-amenities-heading" tabIndex={-1}>Amenities at {props.hotelName}</h2>
      <HotelAmenityList items={allAmenities ? props.amenityItems : props.amenityItems.slice(0, 10)} t={() => ""} className={`${styles.amenities} ${allAmenities ? styles.amenitiesExpanded : props.amenityItems.length <= 5 ? styles.amenitiesSingle : ""}`} />
      {!props.amenityItems.length ? <p>Amenity details are not available yet.</p> : null}
      {props.amenityItems.length > 10 ? <button type="button" className={styles.secondaryButton} aria-expanded={allAmenities} onClick={() => setAllAmenities(value => !value)}>{allAmenities ? "Show fewer amenities" : `Show all ${props.amenityItems.length} amenities`}</button> : null}
      <div className={styles.propertyInfo}>
        <div>
          <h3>Room &amp; comfort</h3>
          {property?.roomSummary ? <p>{property.roomSummary}</p> : null}
          {property?.bedSummary ? <p>{property.bedSummary}</p> : null}
          {!property?.roomSummary && !property?.bedSummary ? <p>Room details are confirmed when you choose a room.</p> : null}
        </div>
      </div>
      <h3>Accessibility</h3>{property?.accessibility?.length ? <ul className={styles.accessibility}>{property.accessibility.map(detail => <li key={detail}>{detail}</li>)}</ul> : <p>Confirm specific accessibility requirements with the property before travel.</p>}
    </section>

    {locationProperty ? <HotelLocationSection variant="desktop" hotelName={props.hotelName} propertyDetails={locationProperty} locationLabel="Location" mapLabel={props.labels.map} streetViewLabel={props.labels.streetView} stayFitFacts={[locationProperty.neighbourhood ? `${locationProperty.neighbourhood} neighborhood` : "", locationProperty.businessSuitable ? "Work-friendly property" : "", locationProperty.familySuitable ? "Family-friendly" : "", locationProperty.interestTags?.some(tag => /sightseeing|culture|history|art|theatre/i.test(tag)) ? "Good for sightseeing" : ""].filter(Boolean)} accessibilityDetails={locationProperty.accessibility} /> : <section id="hotel-location" className={styles.section}><h2 tabIndex={-1}>Location</h2><p>Verified location details are not available for this property yet.</p></section>}



    </div>
    <div data-desktop-section="rate">
    <HotelPriceComparisonSection variant="desktop" stayEditor={<DesktopHotelStayEditor context={context} />}
      stayContext={props.staySummary ? `${props.staySummary.dateText} · ${props.staySummary.occupancyText}` : undefined}
      perNightText={props.perNightText} offers={offers} selectedOfferId={selectedId}
      selectableOfferIds={new Set(offers.map(offer => offer.id))} providerHandoffError={providerHandoffError}
      onSelectOffer={setSelectedOfferId} onContinueOffer={(id, trigger) => void continueOffer(id, trigger)}
      pendingOfferId={pendingProviderOfferId} totalLabel={props.estimatedTotalText} continueLabel={props.labels.continueBooking} />
    </div>

    <div data-desktop-section="review">
    <HotelReviewsSection variant="desktop" score={reviewScore} label={props.reviewLabel} countText={props.reviewCountText} source={props.reviewSource} />
    </div>
    {props.relatedHotels.length ? <div id="hotel-related-hotels" className={styles.related}>
      <RelatedHotelsSection hotels={props.relatedHotels} city={relatedCity} searchContext={props.relatedSearchContext} labels={{ heading: props.labels.moreHotelsIn, viewHotel: props.labels.viewHotel, pricePerNight: props.labels.pricePerNight, estimatedStayTotal: props.labels.estimatedStayTotal, priceUnavailable: props.labels.priceUnavailable, imageUnavailable: props.labels.imageUnavailable, imageAlt: props.labels.imageAlt, nearLocation: props.labels.nearLocation, starHotelAria: props.labels.starHotelAria }} />
    </div> : null}
    {overlay === "rooms" ? <DesktopDialog title={props.labels.roomTitle} close={() => setOverlay(null)}><p className={styles.dialogNote}>{props.planningPriceText}</p><div className={styles.roomOptions}>{props.roomChoices.map(room => <article key={room.id}><div><h3>{room.name}</h3><p>{room.details}</p><p>{room.cancellationInfo || props.labels.roomTerms}</p></div><div className={styles.roomPrice}><strong>{room.total}</strong><span>{room.nightly}</span></div></article>)}</div></DesktopDialog> : null}
  </div>;
}
