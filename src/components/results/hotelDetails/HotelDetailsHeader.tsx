import { Heart, MapPin } from "lucide-react";
import { DetailsBackLink } from "@/components/results/DetailsBackLink";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type SourceAttribution = { provider: string; providerUri?: string };

type HotelDetailsHeaderProps = {
  resultsHref: string;
  backToResultsText: string;
  badges: string[];
  name: string;
  savedHotelLabel: string;
  isSaved: boolean;
  hasValidPrice: boolean;
  saveRequiresLiveRateText: string;
  onSave: () => void;
  saveActionText: string;
  starRating: number | null;
  starRatingAriaLabel: string;
  isGoogleMapsProvider: boolean;
  locationParts: string[];
  reviewBandVisible: boolean;
  reviewScore: string;
  reviewLabel: string;
  reviewCountText: string;
  sourceAttributions: SourceAttribution[];
  isSafeAttributionUrl: (value?: string) => boolean;
};

export function HotelDetailsHeader({
  resultsHref,
  backToResultsText,
  badges,
  name,
  savedHotelLabel,
  isSaved,
  hasValidPrice,
  saveRequiresLiveRateText,
  onSave,
  saveActionText,
  starRating,
  starRatingAriaLabel,
  isGoogleMapsProvider,
  locationParts,
  reviewBandVisible,
  reviewScore,
  reviewLabel,
  reviewCountText,
  sourceAttributions,
  isSafeAttributionUrl,
}: HotelDetailsHeaderProps) {
  return (
    <header className="min-w-0 border-b border-border pb-6 sm:pb-8">
      <DetailsBackLink href={resultsHref}>
        {backToResultsText}
      </DetailsBackLink>
      <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 sm:grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-8">
        <div className="col-start-1 row-start-1 flex min-w-0 flex-wrap items-center gap-2 md:col-span-2">
          {badges.map((badge) => (
            <Badge key={badge} variant="brand" size="sm">
              {badge}
            </Badge>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="col-start-2 row-start-1 shrink-0 whitespace-nowrap sm:col-start-1 sm:row-start-3 sm:mt-4 sm:w-full md:col-start-2 md:row-start-2 md:mt-3 md:w-auto md:justify-self-end"
          aria-label={savedHotelLabel}
          aria-pressed={isSaved}
          title={
            isSaved || hasValidPrice
              ? savedHotelLabel
              : saveRequiresLiveRateText
          }
          disabled={!isSaved && !hasValidPrice}
          onClick={onSave}
        >
          <Heart
            className="h-4 w-4"
            aria-hidden="true"
            fill={isSaved ? "currentColor" : "none"}
          />
          <span>{saveActionText}</span>
        </Button>
        <h1 className="col-span-2 row-start-2 mt-3 min-w-0 max-w-4xl break-words text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:col-span-1 sm:text-4xl md:col-start-1 md:row-start-2 lg:text-[2.625rem]">
          {name}
        </h1>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {starRating ? (
          <div
            aria-label={starRatingAriaLabel}
            className="shrink-0 text-amber-500"
          >
            <span aria-hidden="true">{"★".repeat(starRating)}</span>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-700">
          <MapPin className="h-4 w-4 shrink-0 text-blue" aria-hidden="true" />
          {locationParts.map((part, index) => (
            <span key={`${part}-${index}`}>
              {index > 0 ? <span aria-hidden="true"> · </span> : null}
              {part}
            </span>
          ))}
        </div>
        {reviewBandVisible || reviewCountText ? (
          <div className="flex flex-wrap items-center gap-2">
            {reviewBandVisible ? (
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
      </div>
      <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {isGoogleMapsProvider ? (
          <p className="text-sm font-normal leading-5 text-[#5E5E5E]">
            Hotel discovery data provided by{" "}
            <span
              translate="no"
              className="whitespace-nowrap not-italic text-sm font-normal text-[#5E5E5E]"
            >
              Google Maps
            </span>
          </p>
        ) : null}
        {sourceAttributions.length ? (
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
            {sourceAttributions.map((attribution, index) => (
              <span
                key={`${attribution.provider}-${index}`}
                className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 ring-1 ring-border"
              >
                <span>Data:</span>
                {isSafeAttributionUrl(attribution.providerUri) ? (
                  <a
                    href={attribution.providerUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    translate="no"
                    className="text-[#004BB8] hover:underline"
                  >
                    {attribution.provider}
                  </a>
                ) : (
                  <span translate="no">{attribution.provider}</span>
                )}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}
