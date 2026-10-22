"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Heart, Share2 } from "lucide-react";

export function MobileFlightDetailsBrandHeader({
  resultsHref,
  saved = false,
  savedPending = false,
  onToggleSaved,
  onShare,
  actionsDisabled = false,
}: {
  resultsHref: string;
  saved?: boolean;
  savedPending?: boolean;
  onToggleSaved?: () => void;
  onShare?: () => void;
  actionsDisabled?: boolean;
}) {
  const saveDisabled = actionsDisabled || savedPending || !onToggleSaved;
  const shareDisabled = actionsDisabled || !onShare;

  return (
    <div
      data-mobile-flight-details-brand-header
      className="flex min-h-[64px] items-center justify-between gap-3 bg-white px-4 pt-[env(safe-area-inset-top)] sm:hidden"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href={resultsHref}
          aria-label="Back to results"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0754F7]/35"
        >
          <ArrowLeft className="h-[25px] w-[25px]" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <Image
          src="/brand/kurioticket-logo-primary-light-bg.svg"
          alt="Kurioticket"
          width={128}
          height={32}
          className="h-8 w-32 shrink-0 object-contain object-left"
          priority
        />
      </div>
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          aria-label={saved ? "Remove saved flight" : "Save flight"}
          aria-pressed={saved}
          disabled={saveDisabled}
          onClick={onToggleSaved}
          className="inline-flex h-11 w-11 items-center justify-center text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0754F7]/35 disabled:cursor-default disabled:text-slate-400"
        >
          <Heart className="h-[21px] w-[21px]" strokeWidth={2} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Share flight"
          disabled={shareDisabled}
          onClick={onShare}
          className="inline-flex h-11 w-11 items-center justify-center text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0754F7]/35 disabled:cursor-default disabled:text-slate-400"
        >
          <Share2 className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
