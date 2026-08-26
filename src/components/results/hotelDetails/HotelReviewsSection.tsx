export function HotelReviewsSection({ score, label, countText, source }: { score?: string; label?: string; countText?: string; source?: string | null }) {
  const hasVerifiedReview = Boolean(score && countText);
  return (
    <section id="hotel-reviews" className="scroll-mt-16 border-b border-slate-200 px-4 py-8 lg:px-0 lg:py-10" aria-labelledby="hotel-reviews-heading" data-hotel-reviews-section>
      <h2 id="hotel-reviews-heading" className="text-xl font-extrabold tracking-tight text-slate-950">Guest reviews</h2>
      {hasVerifiedReview ? <div className="mt-4 flex items-center gap-4"><strong className="inline-flex h-14 min-w-14 items-center justify-center rounded-lg bg-blue px-2 text-xl font-extrabold text-white">{score}</strong><div><p className="font-bold text-slate-950">{label}</p><p className="text-sm text-slate-600">{countText}</p>{source ? <p className="mt-1 text-xs text-slate-500">Source: {source}</p> : null}</div></div> : <p className="mt-3 border-l-2 border-slate-200 py-1 pl-4 text-sm leading-6 text-slate-600">Verified guest reviews are not connected for this property yet.</p>}
    </section>
  );
}
