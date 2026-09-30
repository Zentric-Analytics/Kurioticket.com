export function HotelReviewsSection({
  score,
  label,
  countText,
  source,
  variant,
}: {
  score?: string;
  label?: string;
  countText?: string;
  source?: string | null;
  variant?: "desktop";
}) {
  const hasVerifiedReview = Boolean(score && countText);
  const scoreParts = score?.split("/").map((part) => part.trim()) ?? [];
  const displayScore = scoreParts[0] ?? "";
  const scale = scoreParts[1] ?? "";

  if (variant === "desktop") return (
    <section id="hotel-reviews" className="scroll-mt-[84px] border-b border-[#d9dfe2] py-6 text-[#192024]" aria-labelledby="hotel-reviews-heading" data-hotel-reviews-section>
      <h2 id="hotel-reviews-heading" tabIndex={-1} className="text-xl font-semibold leading-6">Guest reviews</h2>
      {hasVerifiedReview ? (
        <div className="mt-4 flex max-w-[520px] items-center gap-5" data-desktop-hotel-review-overview>
          <div className="flex shrink-0 items-baseline">
            <strong className="text-[46px] font-semibold leading-[48px] tracking-[-1.4px] text-[#192024] tabular-nums">{displayScore}</strong>
            {scale ? <span className="ml-1 text-[16px] font-medium leading-[22px] text-[#59636a]">/{scale}</span> : null}
          </div>
          <span aria-hidden="true" className="h-12 w-px shrink-0 bg-[#d9dfe2]" />
          <div className="min-w-0">
            <p className="text-[16px] font-semibold leading-5 text-[#192024]">{label}</p>
            <p className="mt-1 text-[13px] leading-5 text-[#59636a]">{countText}</p>
            {source ? <p className="mt-1 text-[12px] leading-4 text-[#78838a]">Source: {source}</p> : null}
          </div>
        </div>
      ) : <p className="mt-3 text-sm leading-6 text-[#59636a]">Verified guest reviews are not connected for this property yet.</p>}
    </section>
  );

  return (
    <section
      id="hotel-reviews"
      className="scroll-mt-16 border-b border-slate-200 px-4 py-6 lg:px-0 lg:py-10"
      aria-labelledby="hotel-reviews-heading"
      data-hotel-reviews-section
    >
      <h2
        id="hotel-reviews-heading"
        className="text-[18px] font-extrabold tracking-tight text-slate-950 sm:text-xl"
      >
        Guest reviews
      </h2>

      {hasVerifiedReview ? (
        <>
          <div
            className="mt-3 flex items-center gap-4 rounded-[16px] border border-slate-200 bg-white px-4 py-4 lg:hidden"
            data-mobile-hotel-review-card
          >
            <div className="flex min-w-[104px] items-end">
              <strong className="text-[42px] font-bold leading-[46px] tracking-[-0.04em] text-slate-950 tabular-nums">
                {displayScore}
              </strong>
              {scale ? (
                <span className="mb-1.5 ml-1 text-[14px] font-medium leading-5 text-slate-500">
                  / {scale}
                </span>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[18px] font-bold leading-6 text-slate-950">{label}</p>
              <p className="mt-0.5 text-[14px] leading-5 text-slate-600">{countText}</p>
              {source ? (
                <p className="mt-1.5 text-[12px] leading-4 text-slate-500">Source: {source}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 hidden items-center gap-4 lg:flex">
            <strong className="inline-flex h-14 min-w-14 items-center justify-center rounded-lg bg-blue px-2 text-xl font-extrabold text-white">
              {score}
            </strong>
            <div>
              <p className="font-bold text-slate-950">{label}</p>
              <p className="text-sm text-slate-600">{countText}</p>
              {source ? <p className="mt-1 text-xs text-slate-500">Source: {source}</p> : null}
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-[14px] leading-[21px] text-slate-600 sm:border-l-2 sm:border-slate-200 sm:py-1 sm:pl-4 sm:text-sm sm:leading-6">
          Verified guest reviews are not connected for this property yet.
        </p>
      )}
    </section>
  );
}
