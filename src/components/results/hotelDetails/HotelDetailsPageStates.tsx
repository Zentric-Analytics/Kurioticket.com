import type React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DetailsBackLink } from "@/components/results/DetailsBackLink";

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-slate-200 ${className}`}
    />
  );
}

export function HotelDetailsLoadingState({
  loadingText,
  resultsHref = "/hotels/results",
  backToResultsText = "Back to hotel results",
  embedded = false,
  statusRef,
}: {
  loadingText: string;
  resultsHref?: string;
  backToResultsText?: string;
  embedded?: boolean;
  statusRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const content = (
    <section className="border-b border-border bg-white">
      <div
        className="mx-auto w-full max-w-[1400px] px-0 py-6 lg:px-7 lg:py-10"
        data-hotel-details-state-shell
      >
        {!embedded ? (
          <div className="mb-4 hidden px-4 lg:block lg:px-0">
            <DetailsBackLink href={resultsHref}>
              {backToResultsText}
            </DetailsBackLink>
          </div>
        ) : null}
        <div
          ref={statusRef}
          tabIndex={statusRef ? -1 : undefined}
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          {loadingText}
        </div>
        <div
          className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_334px] lg:items-start lg:gap-7"
          data-hotel-loading-main-grid
        >
          <div
            className="flex min-w-0 flex-col bg-white lg:block lg:rounded-[17px] lg:border lg:border-slate-200/80 lg:p-6"
            data-hotel-loading-property-shell
          >
            <div
              className="order-2 px-4 pb-2 pt-3 lg:order-none lg:mb-4 lg:px-0 lg:py-0"
              data-hotel-loading-property-identity
            >
              <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div
                  className="min-w-0 space-y-1.5"
                  data-hotel-loading-metadata
                >
                  <SkeletonBlock className="h-7 w-3/4 max-w-sm" />
                  <SkeletonBlock className="h-5 w-48" />
                  <SkeletonBlock className="h-5 w-36" />
                  <SkeletonBlock className="h-5 w-full max-w-md" />
                  <SkeletonBlock className="h-5 w-24" />
                </div>
                <div className="hidden gap-3 lg:flex" data-hotel-loading-actions>
                  <SkeletonBlock className="size-11 lg:h-10 lg:w-24" />
                  <SkeletonBlock className="size-11 lg:h-10 lg:w-24" />
                </div>
              </div>
            </div>
            <div className="relative order-1 lg:order-none lg:mx-0" data-hotel-loading-gallery>
              <SkeletonBlock className="aspect-[6/5] min-h-[280px] max-h-[440px] w-full rounded-none lg:hidden" />
              <SkeletonBlock className="hidden h-[300px] w-full rounded-[10px] lg:block" />
              <div className="pointer-events-none absolute inset-x-0 top-3 flex items-center justify-between px-3 lg:hidden" data-hotel-loading-hero-actions>
                <SkeletonBlock className="size-11 rounded-full bg-white/90" />
                <SkeletonBlock className="h-11 w-[88px] rounded-full bg-white/90" />
              </div>
            </div>
            <div
              className="order-3 mx-4 mt-3 grid min-h-[52px] grid-cols-2 gap-px overflow-hidden rounded-[11px] border border-slate-200 p-2 sm:grid-cols-4 lg:order-none lg:mx-0 lg:grid-cols-5"
              data-hotel-loading-amenities
            >
              {Array.from({ length: 5 }, (_, index) => (
                <SkeletonBlock key={index} className="h-9 w-full" />
              ))}
            </div>
          </div>
          <aside className="hidden min-w-0 lg:block lg:self-stretch">
            <div className="lg:sticky lg:top-24">
              <Card variant="elevated" className="space-y-4 p-4 sm:p-5">
                <SkeletonBlock className="h-4 w-40" />
                <SkeletonBlock className="h-10 w-52" />
                <SkeletonBlock className="h-5 w-36" />
                <Card variant="subtle" className="space-y-3 rounded-xl p-3">
                  <SkeletonBlock className="h-5 w-full" />
                  <SkeletonBlock className="h-5 w-2/3" />
                  <SkeletonBlock className="h-5 w-3/4" />
                </Card>
                <SkeletonBlock className="h-11 w-full" />
              </Card>
            </div>
          </aside>
          <div className="hidden min-w-0 space-y-4 lg:col-start-1 lg:block">
            {["room", "cancellation", "amenities"].map((section) => (
              <Card key={section} className="space-y-3 p-4 sm:p-5">
                <SkeletonBlock className="h-6 w-40" />
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-5/6" />
              </Card>
            ))}
          </div>
        </div>
      </div>
      {!embedded ? (
        <div
          className="fixed inset-x-0 bottom-0 z-[90] border-t border-slate-200 bg-white px-3 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-6px_22px_rgba(15,23,42,0.12)] min-[390px]:px-4 min-[390px]:pt-3 lg:hidden"
          data-hotel-loading-mobile-dock
        >
          <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_minmax(124px,42%)] items-center gap-2.5 min-[390px]:grid-cols-[minmax(0,1fr)_minmax(140px,0.82fr)] min-[390px]:gap-3">
            <SkeletonBlock className="h-12 w-32 max-w-full" />
            <SkeletonBlock className="h-12 w-full" />
          </div>
        </div>
      ) : null}
    </section>
  );
  return embedded ? (
    content
  ) : (
    <main className="flex-1 bg-surface-muted/40" aria-busy="true">
      {content}
    </main>
  );
}

type HotelDetailsUnavailableStateProps = {
  title: string;
  body: string;
  retryText: string;
  backToResultsText: string;
  resultsHref: string;
  onRetry: () => void;
  embedded?: boolean;
  showBackLink?: boolean;
  headingLevel?: "h1" | "h2";
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
};

export function HotelDetailsUnavailableState({
  title,
  body,
  retryText,
  backToResultsText,
  resultsHref,
  onRetry,
  embedded = false,
  showBackLink = true,
  headingLevel = "h1",
  headingRef,
}: HotelDetailsUnavailableStateProps) {
  const Heading = headingLevel;
  const content = (
    <section className="border-b border-border bg-white">
      <div
        className="mx-auto w-full max-w-[1400px] px-0 py-6 sm:py-8 lg:px-7 lg:py-10"
        data-hotel-details-state-shell
      >
        {!embedded && showBackLink ? (
          <div className="mb-4 px-4 lg:px-0">
            <DetailsBackLink href={resultsHref}>
              {backToResultsText}
            </DetailsBackLink>
          </div>
        ) : null}
        <div className="mx-auto max-w-3xl">
          <Card variant="elevated" className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <AlertTriangle
                className="h-8 w-8 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <Heading
                  ref={headingRef}
                  tabIndex={headingRef ? -1 : undefined}
                  className="text-2xl font-bold text-navy"
                >
                  {title}
                </Heading>
                <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button type="button" onClick={onRetry}>
                    {retryText}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
  return embedded ? (
    content
  ) : (
    <main className="flex-1 bg-surface-muted/40">{content}</main>
  );
}
