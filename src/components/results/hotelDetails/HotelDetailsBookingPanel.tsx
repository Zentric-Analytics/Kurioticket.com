import { CalendarDays, Moon, Users } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getDealsGuidedConfirmationActionId } from "@/lib/deals/dealsConfirmationIds";

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

export type HotelDetailsPrimaryAction =
  | { kind: "provider"; enabled: boolean; pending: boolean; label: string; onActivate: () => void; error: string; disclaimer: string }
  | { kind: "guided-room"; enabled: boolean; pending: boolean; label: string; accessibleLabel: string; unavailableMessage: string; error: string; onActivate: () => void };

export type HotelDetailsChangeSearchAction =
  | { kind: "link"; href: string; label: string }
  | { kind: "hidden" };

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
  changeSearchHref?: string;
  changeSearchText?: string;
  changeSearchAction?: HotelDetailsChangeSearchAction;
  providerPriceLabel: string;
  providerText: string;
  providerUnavailableText: string;
  redirectError?: string;
  providerEnabled?: boolean;
  redirecting?: boolean;
  continueToProviderText?: string;
  onContinue?: () => void;
  providerDisclaimerText?: string;
  primaryAction?: HotelDetailsPrimaryAction;
};

type OpenLineSide = "left" | "right";
type OpenLineTurn = "top" | "bottom";

function OpenSectionLine({
  side,
  turn,
}: {
  side: OpenLineSide;
  turn: OpenLineTurn;
}) {
  const originClasses = {
    "left-top": "start-0 top-0 border-s border-t rounded-ss-2xl",
    "left-bottom": "start-0 bottom-0 border-s border-b rounded-es-2xl",
    "right-top": "end-0 top-0 border-e border-t rounded-se-2xl",
    "right-bottom": "end-0 bottom-0 border-e border-b rounded-ee-2xl",
  }[`${side}-${turn}`];

  return (
    <div
      className="pointer-events-none relative h-5 select-none overflow-visible"
      aria-hidden="true"
    >
      <span
        className={`absolute h-5 w-[calc(100%-2rem)] border-slate-300/80 sm:w-[calc(100%-2.5rem)] ${originClasses}`}
      />
    </div>
  );
}

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
  changeSearchAction,
  providerPriceLabel,
  providerText,
  providerUnavailableText,
  redirectError = "",
  providerEnabled = false,
  redirecting = false,
  continueToProviderText = "",
  onContinue,
  providerDisclaimerText = "",
  primaryAction,
}: HotelDetailsBookingPanelProps) {
  // Standalone compatibility: href={changeSearchHref}, changeSearchText, providerEnabled ?, disabled={redirecting}, onClick={onContinue}, providerDisclaimerText.
  const resolvedChangeSearch = changeSearchAction ?? (changeSearchHref && changeSearchText ? { kind: "link" as const, href: changeSearchHref, label: changeSearchText } : { kind: "hidden" as const });
  const action = primaryAction ?? { kind: "provider" as const, enabled: providerEnabled, pending: redirecting, label: continueToProviderText, onActivate: onContinue ?? (() => undefined), error: redirectError, disclaimer: providerDisclaimerText };
  return (
    <aside className="min-w-0">
      <div className="lg:sticky lg:top-24">
        <Card className="min-w-0 overflow-hidden rounded-2xl border-slate-200/80 bg-white p-0 shadow-none">
          <div>
            <div>
              {priceDetailsAvailable &&
              totalDisplayPrice &&
              nightlyDisplayPrice ? (
                <>
                  <div className="p-5 pb-3 sm:p-6 sm:pb-4">
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
                  </div>
                  <OpenSectionLine side="right" turn="bottom" />
                  <div className="p-5 pt-3 sm:p-6 sm:pt-4">
                    <p
                      className="text-sm font-semibold text-slate-700"
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
                        {providerPriceLabel}:{" "}
                        {totalDisplayPrice.providerFormatted}
                      </p>
                    ) : null}
                    {providerText ? (
                      <p className="mt-2 text-xs font-medium text-slate-500">
                        {providerText}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="space-y-2 p-5 sm:p-6">
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
              <>
                <OpenSectionLine side="left" turn="bottom" />
                <div className="space-y-3 p-5 sm:p-6">
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
              </>
            ) : null}

            <OpenSectionLine side="left" turn="top" />
            <div className="space-y-4 p-5 sm:p-6">
              {resolvedChangeSearch.kind === "link" ? (
                <LinkButton
                  href={resolvedChangeSearch.href}
                  variant="secondary"
                  className="w-full"
                >
                  {resolvedChangeSearch.label}
                </LinkButton>
              ) : null}

              {providerUnavailableText ? (
                <p
                  id="hotel-provider-unavailable-message"
                  className="text-sm font-medium leading-5 text-slate-700"
                >
                  {providerUnavailableText}
                </p>
              ) : null}
              {action.error ? (
                <p
                  role="alert"
                  className="text-sm font-medium leading-5 text-red-700"
                >
                  {action.error}
                </p>
              ) : null}
              {action.kind === "guided-room" && action.unavailableMessage && !action.enabled ? (
                <p id="hotel-guided-room-unavailable-message" className="text-sm font-medium leading-5 text-slate-700">{action.unavailableMessage}</p>
              ) : null}
              {action.enabled ? (
                <div aria-busy={action.pending}>
                  <Button id={action.kind === "guided-room" ? getDealsGuidedConfirmationActionId("hotel") : undefined} type="button" variant="accent" size="lg" className="w-full" disabled={action.pending} onClick={action.onActivate} aria-label={action.kind === "guided-room" ? action.accessibleLabel : undefined}>
                    {action.pending ? `${action.label}...` : action.label}
                  </Button>
                </div>
              ) : null}
              {action.kind === "provider" && action.enabled && action.disclaimer ? (
                <p className="text-xs leading-5 text-slate-500">
                  {action.disclaimer}
                </p>
              ) : null}
            </div>
          </div>
        </Card>
      </div>
    </aside>
  );
}
