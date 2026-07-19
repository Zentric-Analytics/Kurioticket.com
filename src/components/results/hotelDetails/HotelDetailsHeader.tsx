import { ArrowLeft, Heart, MapPin, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";

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
  shareHotelLabel: string;
  onShare: () => void;
  shareActionText: string;
  shareStatus: "idle" | "shared" | "copied" | "error";
  shareFeedbackText: string;
  starRating: number | null;
  starRatingAriaLabel: string;
  locationParts: string[];
  reviewBandVisible: boolean;
  reviewScore: string;
  reviewLabel: string;
  reviewCountText: string;
  reviewSourcePrefix: string;
  reviewSource?: string;
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
  shareHotelLabel,
  onShare,
  shareActionText,
  shareStatus,
  shareFeedbackText,
  starRating,
  starRatingAriaLabel,
  locationParts,
  reviewBandVisible,
  reviewScore,
  reviewLabel,
  reviewCountText,
  reviewSourcePrefix,
  reviewSource,
}: HotelDetailsHeaderProps) {
  return (
    <header className="min-w-0 space-y-3 lg:col-span-2 lg:col-start-1 lg:row-start-1">
      <LinkButton href={resultsHref} variant="ghost" size="sm" className="-ml-2 w-fit px-2 text-slate-700 hover:text-navy">
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{backToResultsText}</span>
      </LinkButton>
      <div className="flex flex-wrap items-center gap-2">{badges.map((badge) => <Badge key={badge} variant="brand" size="sm">{badge}</Badge>)}</div>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="min-w-0 break-words text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">{name}</h1>
        <div className="shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" aria-label={savedHotelLabel} aria-pressed={isSaved} title={isSaved || hasValidPrice ? savedHotelLabel : saveRequiresLiveRateText} disabled={!isSaved && !hasValidPrice} onClick={onSave}>
              <Heart className="h-4 w-4" aria-hidden="true" fill={isSaved ? "currentColor" : "none"} />
              <span>{saveActionText}</span>
            </Button>
            <Button type="button" variant="secondary" size="sm" aria-label={shareHotelLabel} title={shareHotelLabel} onClick={onShare}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              <span>{shareActionText}</span>
            </Button>
          </div>
          {shareStatus !== "idle" ? <p role={shareStatus === "error" ? "alert" : "status"} className={shareStatus === "error" ? "mt-2 text-xs font-medium text-red-700" : "mt-2 text-xs font-medium text-slate-600"}>{shareFeedbackText}</p> : null}
        </div>
      </div>
      {starRating ? <div aria-label={starRatingAriaLabel} className="text-amber-500"><span aria-hidden="true">{"★".repeat(starRating)}</span></div> : null}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-700"><MapPin className="h-4 w-4 shrink-0 text-blue" aria-hidden="true" />{locationParts.map((part, index) => <span key={`${part}-${index}`}>{index > 0 ? <span aria-hidden="true"> · </span> : null}{part}</span>)}</div>
      {reviewBandVisible || reviewCountText || reviewSource ? (
        <div className="flex flex-wrap items-center gap-2">
          {reviewBandVisible ? (
            <Badge variant="brand" size="md">
              {reviewScore} {reviewLabel}
            </Badge>
          ) : null}
          {reviewCountText ? (
            <Badge variant="neutral" size="md">{reviewCountText}</Badge>
          ) : null}
          {reviewSource ? (
            <span className="text-xs font-medium text-slate-600">
              {reviewSourcePrefix}{" "}
              <span translate="no">{reviewSource}</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
