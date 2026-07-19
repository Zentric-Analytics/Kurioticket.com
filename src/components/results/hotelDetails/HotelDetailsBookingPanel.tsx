import { CalendarDays, Moon, Users } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
    <aside className="min-w-0 lg:col-start-2 lg:row-start-2 lg:row-span-2 lg:self-stretch">
      <div className="lg:sticky lg:top-24">
        <Card variant="elevated" className="p-4 sm:p-5">
          <div className="space-y-4">
            <div>
              {priceDetailsAvailable && totalDisplayPrice && nightlyDisplayPrice ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {estimatedStayTotalText}
                  </p>
                  <p
                    className="mt-1 break-words text-3xl font-bold text-slate-950"
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
                    <div className="mt-3 rounded-lg bg-blue/5 p-3 text-xs leading-5 text-slate-700 ring-1 ring-blue/10">
                      <p className="font-semibold">
                        {providerPriceLabel}: {totalDisplayPrice.providerFormatted}
                      </p>
                    </div>
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
              <Card variant="subtle" className="rounded-xl p-3">
                <div className="space-y-2">
                  <p className="flex min-w-0 items-start gap-2 text-sm font-semibold leading-5 text-slate-800">
                    <CalendarDays
                      className="mt-0.5 h-4 w-4 shrink-0 text-blue"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 break-words">
                      {staySummary.dateText}
                    </span>
                  </p>
                  <p className="flex min-w-0 items-start gap-2 text-sm font-medium leading-5 text-slate-700">
                    <Moon
                      className="mt-0.5 h-4 w-4 shrink-0 text-blue"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 break-words">
                      {staySummary.nightText}
                    </span>
                  </p>
                  <p className="flex min-w-0 items-start gap-2 text-sm font-medium leading-5 text-slate-700">
                    <Users
                      className="mt-0.5 h-4 w-4 shrink-0 text-blue"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 break-words">
                      {staySummary.occupancyText}
                    </span>
                  </p>
                </div>
              </Card>
            ) : null}

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
                className="rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-700"
              >
                {providerUnavailableText}
              </p>
            ) : null}
            {redirectError ? (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
              >
                {redirectError}
              </p>
            ) : null}
            <div aria-busy={redirecting}>
              <Button
                type="button"
                variant="accent"
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
        </Card>
      </div>
    </aside>
  );
}
