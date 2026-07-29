import { CalendarDays, Moon, Users } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";

type DisplayPrice = {
  formatted: string;
  title?: string;
  ariaLabel: string;
  currency: string;
  providerFormatted: string;
  sourceCurrency: string;
  isConvertedEstimate: boolean;
  supportingText?: string;
};

type StaySummary = {
  dateText: string;
  occupancyText: string;
  nightText: string;
};

type HotelDetailsBookingPanelProps = {
  priceDetailsAvailable: boolean;
  totalDisplayPrice: DisplayPrice | null;
  nightlyDisplayPrice: DisplayPrice | null;
  estimatedStayTotalText: string;
  pricePerNightText: string;
  taxesText: string;
  priceUnavailableText: string;
  liveRateUnavailableText: string;
  staySummary: StaySummary | null;
  changeSearchHref: string;
  changeSearchText: string;
  providerPriceLabel: string;
  providerText: string;
  providerUnavailableText: string;
  redirectError: string;
  providerEnabled: boolean;
  redirecting: boolean;
  continueToProviderText: string;
  onContinue: () => void;
  providerDisclaimerText: string;
};

export function HotelDetailsBookingPanel({
  priceDetailsAvailable,
  totalDisplayPrice,
  nightlyDisplayPrice,
  estimatedStayTotalText,
  pricePerNightText,
  taxesText,
  priceUnavailableText,
  liveRateUnavailableText,
  staySummary,
  changeSearchHref,
  changeSearchText,
  providerPriceLabel,
  providerText,
  providerUnavailableText,
  redirectError,
  providerEnabled,
  redirecting,
  continueToProviderText,
  onContinue,
  providerDisclaimerText,
}: HotelDetailsBookingPanelProps) {
  return (
    <aside className="min-w-0">
      <div className="lg:sticky lg:top-24">
        <div className="min-w-0 space-y-6">
          <div>
            {priceDetailsAvailable &&
            totalDisplayPrice &&
            nightlyDisplayPrice ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {estimatedStayTotalText}
                </p>
                <p
                  className="mt-1 break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-[2rem]"
                  dir="ltr"
                  title={totalDisplayPrice.title}
                  aria-label={totalDisplayPrice.ariaLabel}
                >
                  {totalDisplayPrice.formatted}
                </p>
                <p
                  className="mt-1 text-sm font-semibold text-slate-700"
                  title={nightlyDisplayPrice.title}
                  aria-label={nightlyDisplayPrice.ariaLabel}
                >
                  {pricePerNightText.replace(
                    "{{price}}",
                    nightlyDisplayPrice.formatted,
                  )}
                </p>
                {taxesText ? (
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {taxesText}
                  </p>
                ) : null}
                {totalDisplayPrice.isConvertedEstimate ? (
                  <p className="mt-3 text-xs font-semibold leading-5 text-slate-700">
                    {providerPriceLabel}: {totalDisplayPrice.providerFormatted}
                  </p>
                ) : null}
                {providerText ? (
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    {providerText}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-3xl font-bold text-slate-950">
                  {priceUnavailableText}
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {liveRateUnavailableText}
                </p>
              </div>
            )}
          </div>

          {staySummary ? (
            <div className="space-y-3">
              <p className="flex min-w-0 items-start gap-2.5 text-sm font-semibold leading-5 text-slate-800">
                <CalendarDays
                  className="mt-0.5 h-4 w-4 shrink-0 text-blue"
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words">
                  {staySummary.dateText}
                </span>
              </p>
              <p className="flex min-w-0 items-start gap-2.5 text-sm font-medium leading-5 text-slate-700">
                <Moon
                  className="mt-0.5 h-4 w-4 shrink-0 text-blue"
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words">
                  {staySummary.nightText}
                </span>
              </p>
              <p className="flex min-w-0 items-start gap-2.5 text-sm font-medium leading-5 text-slate-700">
                <Users
                  className="mt-0.5 h-4 w-4 shrink-0 text-blue"
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words">
                  {staySummary.occupancyText}
                </span>
              </p>
            </div>
          ) : null}

          <div className="space-y-4">
            <LinkButton
              href={changeSearchHref}
              variant="secondary"
              className="w-full"
            >
              {changeSearchText}
            </LinkButton>

            {providerUnavailableText ? (
              <p
                id="hotel-provider-unavailable-message"
                className="text-sm font-medium leading-5 text-slate-700"
              >
                {providerUnavailableText}
              </p>
            ) : null}
            {redirectError ? (
              <p
                role="alert"
                className="text-sm font-medium leading-5 text-red-700"
              >
                {redirectError}
              </p>
            ) : null}
            <div aria-busy={redirecting}>
              <Button
                type="button"
                variant="accent"
                size="lg"
                className="w-full"
                disabled={!providerEnabled || redirecting}
                aria-describedby={
                  providerUnavailableText
                    ? "hotel-provider-unavailable-message"
                    : undefined
                }
                onClick={onContinue}
              >
                {redirecting
                  ? `${continueToProviderText}...`
                  : continueToProviderText}
              </Button>
            </div>
            {providerEnabled ? (
              <p className="text-xs leading-5 text-slate-500">
                {providerDisclaimerText}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
