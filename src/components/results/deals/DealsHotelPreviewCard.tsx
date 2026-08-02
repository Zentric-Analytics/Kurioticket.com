import Image from "next/image";
import { useId } from "react";
import { ArrowRight, BedDouble, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { PublicHotelResult } from "@/lib/types";
import { useRegion } from "@/components/region/RegionProvider";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { getHotelPreviewPrice } from "@/lib/deals/dealsResultsPresentation";
import { getHotelReviewBand, normalizeHotelClassificationStars, normalizeHotelReviewCount, normalizeHotelReviewScale, normalizeHotelReviewScore } from "@/lib/hotels/hotelRatingSemantics";
import { getDealsProviderHandoff } from "@/lib/deals/dealsProviderHandoff";
import { HotelAmenityList } from "@/components/results/HotelAmenityList";
import { buildHotelAmenityPresentation } from "@/components/results/hotelAmenityPresentation";

export function DealsHotelPreviewCard({ hotel, badgeKey, reasonKey, locale, nights, rooms, t, selected, onSelect }: { hotel: PublicHotelResult; badgeKey: string; reasonKey?: string; locale: string; nights: number | null; rooms: number; t: (key: string) => string; selected: boolean; onSelect: () => void }) {
  const { selectedCurrency } = useRegion(); const rates = useCurrencyRates(); const rawPrice = getHotelPreviewPrice(hotel);
  const price = rawPrice ? formatDisplayPrice({ amount: rawPrice.amount, sourceCurrency: rawPrice.currency, displayCurrency: selectedCurrency, convertSourceEstimate: true, rates: rates.rates, isFallbackRate: rates.isFallback }) : null;
  const scale = normalizeHotelReviewScale(hotel.reviewScale); const score = normalizeHotelReviewScore(hotel.reviewScore, scale); const count = normalizeHotelReviewCount(hotel.reviewCount); const band = getHotelReviewBand(score, scale); const stars = normalizeHotelClassificationStars(hotel.classificationStars);
  const amenities = buildHotelAmenityPresentation(hotel.amenities ?? [], 2);
  const hasReviewDetails = score !== undefined && Boolean(scale);
  const hasStayDetails = Boolean(hotel.roomType || hotel.cancellationInfo || amenities.length);
  const hasDetails = hasReviewDetails || hasStayDetails;
  const handoff = getDealsProviderHandoff(hotel, "hotel");
  const unavailableDescriptionId = useId();
  const unavailableReasonKey = !handoff.available && handoff.reason === "discovery_inventory" ? "deals.results.providerHandoff.hotel.discoveryUnavailable" : !handoff.available && handoff.reason === "demo_inventory" ? "deals.results.providerHandoff.hotel.demoUnavailable" : "deals.results.providerHandoff.unavailable";
  return <article className={`flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${selected ? "border-[#004BB8] ring-2 ring-blue-100" : "border-[#D8E1EC]"}`}><div className="p-5 pb-4"><span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-[#004BB8]">{t(badgeKey)}</span>{reasonKey && <p className="mt-2 text-sm leading-5 text-slate-600">{t(reasonKey)}</p>}</div><div className="relative aspect-[16/9] bg-slate-100">{hotel.imageUrl ? <Image src={hotel.imageUrl} alt={t("deals.results.hotelImageAlt").replace("{{name}}", hotel.name)} fill sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw" className="object-cover" /> : <><BedDouble aria-hidden className="absolute inset-0 m-auto h-10 w-10 text-slate-300" /><span className="sr-only">{t("deals.results.hotelImageUnavailable")}</span></>}</div><div className="flex flex-1 flex-col p-5"><h3 className="break-words text-lg font-extrabold text-slate-950">{hotel.name}</h3>{stars && <p aria-label={`${stars} ${t("deals.results.stars")}`} className="mt-1 flex text-amber-500">{Array.from({ length: stars }, (_, index) => <Star key={index} aria-hidden className="h-4 w-4 fill-current" />)}</p>}<p className="mt-1 break-words text-sm text-slate-600">{hotel.neighbourhood || hotel.location}</p>
    {hasDetails && <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
      {hasReviewDetails && score !== undefined && scale && <div className="py-3"><p className="font-bold">{score.toLocaleString(locale)} {band ? t(`hotelResults.reviewBand.${band}`) : ""}</p>{count !== undefined && <p className="text-sm text-slate-500">{count.toLocaleString(locale)} {t(count === 1 ? "deals.results.review" : "deals.results.reviews")}</p>}</div>}
      {hasStayDetails && <div className="space-y-1 py-3 break-words text-sm text-slate-600">{hotel.roomType && <p>{hotel.roomType}</p>}{hotel.cancellationInfo && <p>{hotel.cancellationInfo}</p>}<HotelAmenityList items={amenities} t={t} className="grid grid-cols-1 gap-y-1.5" /></div>}
    </div>}
    <div className="mt-auto pt-5">{price ? <><p className="text-xs font-bold text-slate-500">{price.isConvertedEstimate ? t("estimatedPrice") : t("deals.results.totalStay")}</p><p aria-label={price.ariaLabel} title={price.title} className="break-words text-2xl font-extrabold text-[#004BB8]">{price.formatted}</p>{price.isConvertedEstimate && <p className="break-words text-xs text-slate-500">{t("providerPrice")}: {price.providerFormatted}</p>}<p className="mt-1 text-xs text-slate-500">{t("deals.results.totalStay")} · {nights ?? "–"} {t(nights === 1 ? "deals.results.night" : "deals.results.nights")} · {rooms} {t("deals.results.rooms")}</p>{hotel.taxesAndFeesIncluded === true && <p className="mt-1 text-xs text-slate-600">{t("deals.results.taxesIncluded")}</p>}{hotel.taxesAndFeesIncluded === false && <p className="mt-1 text-xs text-slate-600">{t("deals.results.taxesExcluded")}</p>}</> : <p className="font-bold text-slate-700">{t("deals.results.priceUnavailable")}</p>}</div>
    <div className="mt-5 border-t border-slate-200 pt-4">{handoff.available ? <><p className="mb-3 text-xs leading-5 text-slate-600">{t("deals.selection.disclosure")}</p><button type="button" aria-pressed={selected} onClick={onSelect} aria-label={t(selected ? "deals.selection.hotel.selectedAccessible" : "deals.selection.hotel.accessible").replace("{{hotel}}", hotel.name)} className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl border px-4 py-2 text-center font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${selected ? "border-[#004BB8] bg-[#004BB8] text-white" : "border-[#004BB8] bg-white text-[#004BB8]"}`}>{t(selected ? "deals.selection.hotel.selected" : "deals.selection.hotel.choose")}</button></> : <><span id={unavailableDescriptionId} className="sr-only">{t(unavailableReasonKey)}</span><Button type="button" variant="accent" size="lg" className="w-full" disabled aria-describedby={unavailableDescriptionId}>{t("continueToProvider")}<ArrowRight size={16} aria-hidden /></Button></>}</div>
    </div></article>;
}
