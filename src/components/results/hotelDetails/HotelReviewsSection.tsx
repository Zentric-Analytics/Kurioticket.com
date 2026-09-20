export function HotelReviewsSection({
  score,
  label,
  countText,
  source,
}: {
  score?: string;
  label?: string;
  countText?: string;
  source?: string | null;
}) {
  const hasVerifiedReview = Boolean(score && countText);
  const scoreParts = score?.split("/").map((part) => part.trim()) ?? [];
  const displayScore = scoreParts[0] ?? "";
  const scale = scoreParts[1] ?? "";

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
            className="mt-3 flex items-center gap-4 rounded-[16px] border border-slate-200 bg-white px-4 py-4 sm:hidden"
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

          <div className="mt-4 hidden items-center gap-4 sm:flex">
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
