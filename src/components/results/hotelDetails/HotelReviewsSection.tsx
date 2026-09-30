export function HotelReviewsSection({
  score,
  label,
  countText,
  source,
  hotelName,
  sentiment,
  quotes,
  variant,
}: {
  score?: string;
  label?: string;
  countText?: string;
  source?: string | null;
  hotelName?: string;
  sentiment?: string;
  quotes?: Array<{ label: string; value: string }>;
  variant?: "desktop";
}) {
  const hasVerifiedReview = Boolean(score && countText);
  const scoreParts = score?.split("/").map((part) => part.trim()) ?? [];
  const displayScore = scoreParts[0] ?? "";
  const scale = scoreParts[1] ?? "";
  const guestSentiment = sentiment?.trim() ?? "";
  const showGuestSentiment = Boolean(guestSentiment && guestSentiment.toLowerCase() !== label?.trim().toLowerCase());
  const suppliedQuotes = (quotes ?? []).filter((fact) => fact.value.trim());
  const hasProviderReviewDetails = showGuestSentiment || suppliedQuotes.length > 0;

  if (variant === "desktop") return (
    <section id="hotel-reviews" className="scroll-mt-[84px] border-b border-[#d9dfe2] py-6 text-[#192024]" aria-labelledby="hotel-reviews-heading" data-hotel-reviews-section>
      <h2 id="hotel-reviews-heading" tabIndex={-1} className="text-xl font-semibold leading-6">
        {hotelName ? `Reviews of ${hotelName}` : "Guest reviews"}
      </h2>
      {hasVerifiedReview ? (
        <div className={`mt-5 grid gap-8 ${hasProviderReviewDetails ? "grid-cols-[minmax(220px,0.8fr)_minmax(0,1.35fr)]" : "grid-cols-1"}`} data-desktop-hotel-reviews-layout>
          <div className="min-w-0 max-w-[360px]" data-desktop-hotel-review-overview>
            <div className="flex items-end gap-4">
              <div className="flex shrink-0 items-baseline">
                <strong className="text-[46px] font-semibold leading-[48px] tracking-[-1.4px] text-[#192024] tabular-nums">{displayScore}</strong>
                {scale ? <span className="ml-1 text-[16px] font-medium leading-[22px] text-[#59636a]">/{scale}</span> : null}
              </div>
              <div className="min-w-0 pb-1">
                <p className="text-[16px] font-semibold leading-5 text-[#192024]">{label}</p>
                <p className="mt-1 text-[13px] leading-5 text-[#59636a]">{countText}</p>
              </div>
            </div>
            {source ? <p className="mt-3 text-[12px] leading-4 text-[#78838a]">Source: {source}</p> : null}
          </div>

          {hasProviderReviewDetails ? (
            <div className="min-w-0 max-w-[680px]" data-desktop-hotel-guests-say>
              <h3 className="text-[15px] font-semibold leading-5 text-[#192024]">Guests say</h3>
              {showGuestSentiment ? <p className="mt-2 text-[14px] leading-[22px] text-[#303b42]">{guestSentiment}</p> : null}
              {suppliedQuotes.length ? (
                <ul className="mt-3 grid gap-2 text-[13px] leading-5 text-[#303b42]">
                  {suppliedQuotes.map((fact, index) => (
                    <li key={`${fact.label}-${fact.value}-${index}`} className="flex gap-2">
                      <span aria-hidden="true" className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#59636a]" />
                      <span>
                        {!/^review quotes$/i.test(fact.label.trim()) ? <strong className="font-semibold text-[#192024]">{fact.label}: </strong> : null}
                        {fact.value}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
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
