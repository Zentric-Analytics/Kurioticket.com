import type React from "react";
import { AlertTriangle } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-slate-200 ${className}`}
    />
  );
}

export function HotelDetailsLoadingState({ loadingText, embedded = false, statusRef }: { loadingText: string; embedded?: boolean; statusRef?: React.RefObject<HTMLDivElement | null> }) {
  const content = (
      <section className="border-b border-border bg-white">
        <div className="page-shell py-6 sm:py-8 lg:py-10">
          <div
          ref={statusRef}
          tabIndex={statusRef ? -1 : undefined}
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          {loadingText}
          </div>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
          <Card className="min-w-0 space-y-4 p-4 sm:p-6 lg:col-span-2 lg:col-start-1 lg:row-start-1">
            <SkeletonBlock className="h-9 w-36" />
            <SkeletonBlock className="h-6 w-48" />
            <SkeletonBlock className="h-10 w-3/4" />
            <SkeletonBlock className="h-5 w-2/3" />
          </Card>
          <Card className="min-w-0 p-3 lg:col-start-1 lg:row-start-2">
            <SkeletonBlock className="aspect-[16/10] w-full rounded-xl" />
            <div className="mt-3 grid grid-cols-4 gap-2">
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
            </div>
          </Card>
          <aside className="min-w-0 lg:col-start-2 lg:row-start-2 lg:row-span-2 lg:self-stretch">
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
          <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-3">
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
      </section>
  );
  return embedded ? content : <main className="flex-1 bg-surface-muted/40" aria-busy="true">{content}</main>;
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
        <div className="page-shell py-6 sm:py-8 lg:py-10">
          <div className="mx-auto max-w-3xl">
          <Card variant="elevated" className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <AlertTriangle
                className="h-8 w-8 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <Heading ref={headingRef} tabIndex={headingRef ? -1 : undefined} className="text-2xl font-bold text-navy">{title}</Heading>
                <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button type="button" onClick={onRetry}>
                    {retryText}
                  </Button>
                  {showBackLink ? (
                    <LinkButton href={resultsHref} variant="secondary">
                      {backToResultsText}
                    </LinkButton>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
          </div>
        </div>
      </section>
  );
  return embedded ? content : <main className="flex-1 bg-surface-muted/40">{content}</main>;
}
