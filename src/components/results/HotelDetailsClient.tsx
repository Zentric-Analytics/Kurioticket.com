"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  AirVent,
  Armchair,
  Bike,
  Building2,
  BusFront,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CircleParking,
  Clock3,
  Coffee,
  ConciergeBell,
  CookingPot,
  Dumbbell,
  Flower2,
  Laptop,
  MapPin,
  Trees,
  UtensilsCrossed,
  VolumeX,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import type { PublicHotelResult } from "@/lib/types";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import {
  buildHotelGalleryCandidates,
  getAdjacentHotelGalleryIndex,
  resolveHotelGalleryIndex,
} from "@/components/results/hotelGalleryPresentation";
import {
  buildHotelAmenityPresentation,
  type HotelAmenityIconKey,
  type HotelAmenityPresentationItem,
} from "@/components/results/hotelAmenityPresentation";
import {
  getHotelReviewBand,
  getHotelReviewCount,
  type HotelReviewBand,
} from "@/components/results/hotelReviewPresentation";

const amenityIcons: Record<HotelAmenityIconKey, LucideIcon> = {
  wifi: Wifi,
  breakfast: Coffee,
  pool: Waves,
  spa: Flower2,
  airportShuttle: BusFront,
  parking: CircleParking,
  fitness: Dumbbell,
  workspace: Laptop,
  quietRooms: VolumeX,
  frontDesk: ConciergeBell,
  lateCheckIn: Clock3,
  kitchenette: CookingPot,
  bikeStorage: Bike,
  courtyard: Trees,
  lounge: Armchair,
  restaurant: UtensilsCrossed,
  airConditioning: AirVent,
  generic: CircleDot,
};

const reviewLabelKeys: Record<HotelReviewBand, string> = {
  exceptional: "hotelResults.review.exceptional",
  veryGood: "hotelResults.review.veryGood",
  good: "hotelResults.review.good",
  pleasant: "hotelResults.review.pleasant",
  reviewScore: "hotelResults.review.score",
};

const reviewLabelFallbacks: Record<HotelReviewBand, string> = {
  exceptional: "Exceptional",
  veryGood: "Very good",
  good: "Good",
  pleasant: "Pleasant",
  reviewScore: "Review score",
};

export type HotelDetailsSearchContext = {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  rooms?: string;
};

type HotelDetailsClientProps = {
  id: string;
  searchContext?: HotelDetailsSearchContext;
};

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function getDistinctHotelLocationParts(hotel: PublicHotelResult, distanceText: string) {
  const parts: string[] = [];
  const seen = new Set<string>();
  const mainLocation = normalizeWhitespace(hotel.location || "");
  const normalizedMainLocation = mainLocation.toLocaleLowerCase();

  for (const value of [mainLocation, hotel.neighbourhood, distanceText]) {
    const displayText = normalizeWhitespace(value || "");
    if (!displayText) continue;

    const comparisonText = displayText.toLocaleLowerCase();
    if (seen.has(comparisonText)) continue;
    if (parts.length > 0 && normalizedMainLocation.includes(comparisonText)) continue;

    parts.push(displayText);
    seen.add(comparisonText);
  }

  return parts;
}

function toTitleCase(value: string) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return "";
  const title =
    normalized === normalized.toLocaleUpperCase() ||
    normalized === normalized.toLocaleLowerCase()
      ? normalized.toLocaleLowerCase()
      : normalized;
  return title.replace(/(^|[\s/-])([\p{L}\p{N}])/gu, (_m, sep: string, ch: string) => `${sep}${ch.toLocaleUpperCase()}`);
}

function toSentenceCase(value: string) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return "";
  const sentence =
    normalized === normalized.toLocaleUpperCase() ||
    normalized === normalized.toLocaleLowerCase()
      ? normalized.toLocaleLowerCase()
      : normalized;
  return `${sentence.charAt(0).toLocaleUpperCase()}${sentence.slice(1)}`;
}

function formatRating(rating: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: Number.isInteger(rating) ? 0 : 1,
    minimumFractionDigits: Number.isInteger(rating) ? 0 : 1,
  }).format(rating);
}

function getStarRating(rating: number) {
  if (!Number.isFinite(rating) || rating <= 0) return null;
  return Math.min(Math.max(Math.floor(rating), 1), 5);
}

function meaningfulDistance(value?: string) {
  const text = value ? toSentenceCase(value) : "";
  if (/^(central|transit-friendly area|central or transit-friendly area)$/i.test(text)) return "";
  return text;
}

function translateKnownLabel(value: string, t: (key: string) => string) {
  const normalized = normalizeWhitespace(value).toLocaleLowerCase();
  const keys: Record<string, string> = {
    "half board": "hotelResults.filter.halfBoard",
    "full board": "hotelResults.filter.fullBoard",
    "all-inclusive": "hotelResults.filter.allInclusive",
    "all inclusive": "hotelResults.filter.allInclusive",
    "bed and breakfast": "hotelResults.filter.bedAndBreakfast",
    breakfast: "hotelResults.filter.breakfastIncludedAvailable",
    "room only": "hotelResults.filter.roomOnly",
    "accommodation only": "hotelResults.filter.roomOnly",
    "double room": "hotelResults.filter.doubleRoom",
    "king bed": "hotelResults.filter.kingBed",
    "deluxe king room": "hotelResults.filter.deluxeKingRoom",
    "classic room": "hotelResults.filter.classicRoom",
    "luxury king": "hotelResults.filter.luxuryKing",
    "single standard": "hotelResults.filter.singleStandard",
    "superior room": "hotelResults.filter.superiorRoom",
    "superior double room": "hotelResults.filter.superiorDoubleRoom",
  };
  return keys[normalized] ? t(keys[normalized]) || value : value;
}

function getMealPlan(hotel: PublicHotelResult, roomTypeText: string, t: (key: string) => string) {
  const mealText = [hotel.roomType, ...hotel.amenities]
    .map((value) => toSentenceCase(value || ""))
    .find((value) => /breakfast|room only|accommodation only|half board|full board|all[-\s]?inclusive/i.test(value));
  if (!mealText || toTitleCase(mealText) === roomTypeText) return "";
  return translateKnownLabel(mealText, t);
}

function getCancellationText(value: string, t: (key: string) => string) {
  const text = normalizeWhitespace(value || "");
  if (!text) return "";
  if (/\bnon[-\s]?refundable\b|\bno refunds?\b/i.test(text)) return t("hotelResults.nonRefundable") || text;
  if (/\bfree cancellation\b/i.test(text)) return t("hotelResults.filter.freeCancellation") || text;
  if (/\bpay (?:at|on) (?:the )?property\b/i.test(text)) return t("hotelResults.payAtProperty") || text;
  if (/\bpay later\b/i.test(text)) return t("hotelResults.payLater") || text;
  if (/\bno prepayment\b/i.test(text)) return t("hotelResults.noPrepayment") || text;
  if (/\brefundable\b/i.test(text)) return t("hotelResults.refundable") || text;
  return text;
}

function canUseProviderLink(hotel: PublicHotelResult | null) {
  if (!hotel || hotel.dataSource === "demo") return false;
  const candidate = hotel.partnerRedirectUrl || hotel.bookingUrl;
  if (!candidate) return false;
  try {
    return ["http:", "https:"].includes(new URL(candidate).protocol);
  } catch {
    return false;
  }
}

function localizeAmenityItems(items: HotelAmenityPresentationItem[], t: (key: string) => string) {
  return items.map((item) => ({ ...item, label: item.translationKey ? t(item.translationKey) || item.label : item.label }));
}

export function HotelDetailsClient({ id }: HotelDetailsClientProps) {
  const { locale, t: dictionary } = useLocale();
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const [hotel, setHotel] = useState<PublicHotelResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [redirectError, setRedirectError] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [preferredImageIndex, setPreferredImageIndex] = useState(0);
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;
    const unavailableFallback =
      enTranslations["hotelDetails.unavailableBody"] ||
      "This hotel quote is no longer available. Please search again for current prices.";

    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setHotel(null);
      setLoadError("");
      setRedirectError("");
      setPreferredImageIndex(0);
      setFailedImageUrls(new Set());
    });

    fetch(`/api/hotels/details?id=${encodeURIComponent(id)}`)
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { hotel?: PublicHotelResult; error?: string };
        if (!response.ok || !data.hotel) throw new Error(data.error || unavailableFallback);
        return data.hotel;
      })
      .then((nextHotel) => {
        if (!active) return;
        setHotel(nextHotel);
        setLoadError("");
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : unavailableFallback);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  async function continueToProvider() {
    if (!hotel || redirecting || !canUseProviderLink(hotel)) return;
    setRedirecting(true);
    setRedirectError("");
    try {
      const response = await fetch("/api/redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type: "hotel", sourcePage: "hotel_details" }),
      });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || t("hotelDetails.redirectError"));
      window.location.href = data.url;
    } catch (error) {
      setRedirectError(error instanceof Error ? error.message : t("hotelDetails.redirectError"));
      setRedirecting(false);
    }
  }

  if (loading) {
    return (
      <main className="page-shell flex-1 py-10">
        <Card className="p-6 text-muted">{t("hotelDetails.loading") || enTranslations["hotelDetails.loading"]}</Card>
      </main>
    );
  }

  if (loadError || !hotel) {
    return (
      <main className="page-shell flex-1 py-10">
        <Card className="p-6">
          <h1 className="text-xl font-bold text-navy">{t("hotelDetails.unavailableTitle") || enTranslations["hotelDetails.unavailableTitle"]}</h1>
          <p className="mt-2 text-muted">{t("hotelDetails.unavailableBody") || enTranslations["hotelDetails.unavailableBody"]}</p>
        </Card>
      </main>
    );
  }

  const totalDisplayPrice = formatDisplayPrice({
    amount: hotel.totalPrice,
    sourceCurrency: hotel.currency,
    displayCurrency: selectedOption.currency,
    convertSourceEstimate: true,
    rates: currencyRates.rates,
    isFallbackRate: currencyRates.isFallback,
  });
  const nightlyDisplayPrice = formatDisplayPrice({
    amount: hotel.pricePerNight,
    sourceCurrency: hotel.currency,
    displayCurrency: selectedOption.currency,
    convertSourceEstimate: true,
    rates: currencyRates.rates,
    isFallbackRate: currencyRates.isFallback,
  });
  const starRating = getStarRating(hotel.rating);
  const galleryCandidates = buildHotelGalleryCandidates(hotel.imageUrls, hotel.imageUrl);
  const displayCandidates = galleryCandidates;
  const activeIndex = resolveHotelGalleryIndex(displayCandidates, failedImageUrls, preferredImageIndex);
  const usableIndices = displayCandidates.reduce<number[]>((indices, url, index) => {
    if (!failedImageUrls.has(url)) indices.push(index);
    return indices;
  }, []);
  const activeUrl = activeIndex >= 0 ? displayCandidates[activeIndex] : "";
  const showGalleryControls = usableIndices.length > 1;
  const activePosition = Math.max(0, usableIndices.indexOf(activeIndex));
  const photoCounter = (t("hotelResults.photoCounter") || "{{current}} of {{total}} photos")
    .replace("{{current}}", String(activePosition + 1))
    .replace("{{total}}", String(usableIndices.length));
  const roomType = hotel.roomType ? translateKnownLabel(toTitleCase(hotel.roomType), t) : "";
  const mealPlan = getMealPlan(hotel, roomType, t);
  const cancellationText = getCancellationText(hotel.cancellationInfo, t);
  const distanceText = meaningfulDistance(hotel.distanceFromCenter);
  const locationParts = getDistinctHotelLocationParts(hotel, distanceText);
  const amenityItems = localizeAmenityItems(buildHotelAmenityPresentation(hotel.amenities, hotel.amenities.length), t);
  const reviewBand = getHotelReviewBand(hotel.reviewScore);
  const reviewCount = getHotelReviewCount(hotel.reviewCount);
  const reviewLabel = reviewBand ? t(reviewLabelKeys[reviewBand]) || reviewLabelFallbacks[reviewBand] : "";
  const reviewScore = reviewBand ? new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(hotel.reviewScore || 0) : "";
  const reviewCountText = reviewCount !== null ? (reviewCount === 1 ? t("hotelResults.review.single") || "{{count}} review" : t("hotelResults.review.multiple") || "{{count}} reviews").replace("{{count}}", new Intl.NumberFormat(locale).format(reviewCount)) : "";
  const taxesText = hotel.taxesAndFeesIncluded === true ? t("hotelResults.taxesFeesIncluded") : hotel.taxesAndFeesIncluded === false ? t("hotelResults.taxesFeesNotIncluded") : "";
  const providerEnabled = canUseProviderLink(hotel);
  const providerUnavailableText = hotel.dataSource === "demo" ? t("hotelDetails.demoBookingUnavailable") : !providerEnabled ? t("hotelDetails.directLinkUnavailable") : "";

  function markImageFailed(url: string) {
    setFailedImageUrls((current) => {
      if (current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
    });
  }

  function selectAdjacentImage(direction: -1 | 1) {
    const nextIndex = getAdjacentHotelGalleryIndex(displayCandidates, failedImageUrls, activeIndex, direction);
    if (nextIndex !== -1) setPreferredImageIndex(nextIndex);
  }

  return (
    <main className="flex-1 bg-surface-muted/40">
      <section className="page-shell py-6 sm:py-8 lg:py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
          <header className="min-w-0 space-y-3 lg:col-start-1 lg:row-start-1">
            <div className="flex flex-wrap items-center gap-2">
              {hotel.badges.map((badge) => (
                <Badge key={badge} variant="brand" size="sm">
                  {badge}
                </Badge>
              ))}
            </div>
            <h1 className="break-words text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">{hotel.name}</h1>
            {starRating ? (
              <div aria-label={t("hotelResults.starHotelAria").replace("{{rating}}", formatRating(hotel.rating, locale))} className="text-amber-500">
                <span aria-hidden="true">{"★".repeat(starRating)}</span>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-700">
              <MapPin className="h-4 w-4 shrink-0 text-blue" aria-hidden="true" />
              {locationParts.map((part, index) => (
                <span key={`${part}-${index}`}>
                  {index > 0 ? <span aria-hidden="true"> · </span> : null}
                  {part}
                </span>
              ))}
            </div>
            {(reviewBand || reviewCountText) ? (
              <div className="flex flex-wrap items-center gap-2">
                {reviewBand ? (
                  <Badge variant="brand" size="md">
                    {reviewScore} {reviewLabel}
                  </Badge>
                ) : null}
                {reviewCountText ? (
                  <Badge variant="neutral" size="md">
                    {reviewCountText}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </header>

          <Card variant="flat" className="overflow-hidden p-0 lg:col-start-1 lg:row-start-2">
            <div className="relative h-[260px] bg-slate-100 sm:h-[420px]">
              {activeUrl ? (
                <Image
                  src={activeUrl}
                  alt={t("hotelResults.hotelImageAlt").replace("{{name}}", hotel.name).replace("{{location}}", hotel.location ? ` ${t("hotelResults.nearLocation").replace("{{location}}", hotel.location)}` : "")}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 680px, 100vw"
                  onError={() => markImageFailed(activeUrl)}
                  priority
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-blue/10 via-surface to-surface-subtle px-6 text-center">
                  <Building2 className="h-11 w-11 text-blue" aria-hidden="true" />
                  <span className="max-w-xs text-sm font-semibold text-slate-600">
                    {t("hotelResults.imageUnavailable")}
                  </span>
                </div>
              )}
              {showGalleryControls ? (
                <>
                  <IconButton variant="primary" size="md" className="absolute left-3 top-1/2 -translate-y-1/2 shadow-md" aria-label={t("hotelResults.previousPhoto")} onClick={() => selectAdjacentImage(-1)}><ChevronLeft className="h-5 w-5" aria-hidden="true" /></IconButton>
                  <IconButton variant="primary" size="md" className="absolute right-3 top-1/2 -translate-y-1/2 shadow-md" aria-label={t("hotelResults.nextPhoto")} onClick={() => selectAdjacentImage(1)}><ChevronRight className="h-5 w-5" aria-hidden="true" /></IconButton>
                  <div className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold text-white">{photoCounter}</div>
                </>
              ) : null}
            </div>
            {showGalleryControls ? (
              <div className="flex max-w-full gap-2 overflow-x-auto p-3">
                {usableIndices.map((imageIndex, visibleIndex) => {
                  const thumbnailUrl = displayCandidates[imageIndex];
                  return (
                    <button key={thumbnailUrl} type="button" aria-pressed={activeIndex === imageIndex} aria-label={(t("hotelResults.selectPhoto") || "Show photo {{number}}").replace("{{number}}", String(visibleIndex + 1))} className={activeIndex === imageIndex ? "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 ring-blue ring-offset-2" : "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"} onClick={() => setPreferredImageIndex(imageIndex)}>
                      <Image src={thumbnailUrl} alt="" fill className="object-cover" sizes="96px" onError={() => markImageFailed(thumbnailUrl)} />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </Card>

          <aside className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:self-stretch">
            <div className="lg:sticky lg:top-24">
              <Card variant="elevated" className="p-4 sm:p-5">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("hotelResults.estimatedStayTotal")}</p>
                    <p className="mt-1 break-words text-3xl font-bold text-slate-950" dir="ltr" title={totalDisplayPrice.title} aria-label={totalDisplayPrice.ariaLabel}>{totalDisplayPrice.formatted}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700" title={nightlyDisplayPrice.title} aria-label={nightlyDisplayPrice.ariaLabel}>{t("hotelResults.pricePerNight").replace("{{price}}", nightlyDisplayPrice.formatted)}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{taxesText}</p>
                    <p className="mt-2 text-xs font-medium text-slate-500">{totalDisplayPrice.currency}</p>
                  </div>
                  {hotel.provider && hotel.dataSource !== "demo" ? <p className="text-sm font-medium text-slate-700">{t("providedBy")} {hotel.provider}</p> : null}
                  {providerUnavailableText ? <p className="rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-700">{providerUnavailableText}</p> : null}
                  {redirectError ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{redirectError}</p> : null}
                  {providerEnabled ? (
                    <>
                      <Button type="button" variant="accent" className="w-full" disabled={redirecting} onClick={continueToProvider}>
                        {redirecting ? `${t("continueToProvider")}...` : t("continueToProvider")}
                      </Button>
                      <p className="text-xs leading-5 text-slate-500">{t("hotelDetails.providerDisclaimer") || enTranslations["hotelDetails.providerDisclaimer"]}</p>
                    </>
                  ) : null}
                </div>
              </Card>
            </div>
          </aside>

          <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-3">
            <StayDetailsSection
              roomTitle={t("hotelResults.roomDetails") || "Room"}
              roomItems={[roomType, mealPlan]}
              cancellationTitle={t("hotelResults.cancellationDetails") || "Cancellation"}
              cancellationItems={[cancellationText]}
            />
            {amenityItems.length > 0 ? <AmenitySection title={t("hotelResults.amenitiesDetails") || "Amenities"} items={amenityItems} /> : null}
            {hotel.recommendationReasons.length > 0 ? <DetailSection title="Why this hotel" items={hotel.recommendationReasons} /> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

type StayDetailsSectionProps = {
  roomTitle: string;
  roomItems: string[];
  cancellationTitle: string;
  cancellationItems: string[];
};

function StayDetailsSection({ roomTitle, roomItems, cancellationTitle, cancellationItems }: StayDetailsSectionProps) {
  const sections = [
    { title: roomTitle, items: roomItems.map((item) => item.trim()).filter(Boolean) },
    { title: cancellationTitle, items: cancellationItems.map((item) => item.trim()).filter(Boolean) },
  ].filter((section) => section.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <Card variant="flat" className="p-4 sm:p-6">
      <div className={sections.length > 1 ? "grid gap-5 sm:grid-cols-2 sm:gap-6" : ""}>
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-base font-bold text-slate-950">{section.title}</h2>
            <ul className="mt-3 space-y-2 text-sm font-medium leading-6 text-slate-700">
              {section.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  );
}

function DetailSection({ title, items }: { title: string; items: string[] }) {
  const visibleItems = items.map((item) => item.trim()).filter(Boolean);
  if (visibleItems.length === 0) return null;
  return (
    <Card variant="flat" className="p-4 sm:p-6">
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm font-medium leading-6 text-slate-700">
        {visibleItems.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </Card>
  );
}

function AmenitySection({ title, items }: { title: string; items: HotelAmenityPresentationItem[] }) {
  return (
    <Card variant="flat" className="p-4 sm:p-6">
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2" role="list">
        {items.map((item) => {
          const Icon = amenityIcons[item.iconKey];
          return (
            <li key={item.key} className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700">
              <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              <span>{item.label}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
