import {
  BedDouble,
  CalendarClock,
  Check,
  CheckCircle2,
  Utensils,
} from "lucide-react";
import { useId } from "react";
import type { DisplayPrice } from "@/lib/currency/formatCurrency";
import type { HotelRoomOption } from "@/lib/hotels/hotelRoomOptions";

type GuidedHotelRoomCardProps = {
  option: HotelRoomOption;
  nightlyPrice: DisplayPrice;
  totalPrice: DisplayPrice;
  selected: boolean;
  lowestEstimate: boolean;
  planningOptionText: string;
  lowestEstimateText: string;
  perRoomNightText: string;
  indicativeTotalText: string;
  selectRoomText: string;
  selectedText: string;
  onSelect: () => void;
};

export function GuidedHotelRoomCard({
  option,
  nightlyPrice,
  totalPrice,
  selected,
  lowestEstimate,
  planningOptionText,
  lowestEstimateText,
  perRoomNightText,
  indicativeTotalText,
  selectRoomText,
  selectedText,
  onSelect,
}: GuidedHotelRoomCardProps) {
  const inputId = useId();

  return (
    <div className="relative h-full min-w-0">
      <input
        id={inputId}
        type="radio"
        name="guided-hotel-room"
        value={option.id}
        checked={selected}
        onChange={onSelect}
        className="peer sr-only"
        aria-label={`${selectRoomText}: ${option.name}`}
      />
      <label
        htmlFor={inputId}
        className={`flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_14px_34px_-28px_rgba(2,28,43,0.45)] transition duration-200 hover:border-blue-300 hover:shadow-[0_18px_38px_-25px_rgba(2,28,43,0.38)] motion-safe:hover:-translate-y-0.5 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2 ${selected ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-600" : "border-slate-200"}`}
      >
        <span className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
          <span className="flex min-h-7 flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
              {planningOptionText}
            </span>
            {lowestEstimate ? (
              <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-900">
                {lowestEstimateText}
              </span>
            ) : null}
            {selected ? (
              <span className="ms-auto inline-flex items-center gap-1 text-xs font-extrabold text-blue-800">
                <Check aria-hidden="true" className="size-4" />
                {selectedText}
              </span>
            ) : null}
          </span>

          <span className="mt-4 block break-words text-xl leading-snug font-extrabold text-slate-950">
            {option.name}
          </span>

          <span className="mt-4 space-y-3 text-sm text-slate-700">
            <span className="flex min-w-0 items-start gap-2.5">
              <BedDouble
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-blue-700"
              />
              <span className="min-w-0 break-words">
                {option.bedConfiguration}
              </span>
            </span>
            {option.features.map((feature) => (
              <span key={feature} className="flex min-w-0 items-start gap-2.5">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-teal-700"
                />
                <span className="min-w-0 break-words">{feature}</span>
              </span>
            ))}
            <span className="flex min-w-0 items-start gap-2.5">
              <Utensils
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-blue-700"
              />
              <span className="min-w-0 break-words">{option.mealPlan}</span>
            </span>
          </span>

          <span className="mt-4 flex min-w-0 items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
            <CalendarClock
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-slate-600"
            />
            <span className="min-w-0 break-words">
              {option.cancellationInfo}
            </span>
          </span>

          <span className="mt-auto block min-w-0 pt-5">
            <span className="block border-t border-slate-200 pt-5">
              <span
                dir="ltr"
                title={nightlyPrice.title}
                aria-label={nightlyPrice.ariaLabel}
                className="block min-w-0 break-words text-2xl leading-tight font-extrabold tabular-nums text-slate-950"
              >
                {nightlyPrice.formatted}
              </span>
              <span className="mt-1 block text-sm text-slate-600">
                {perRoomNightText}
              </span>
            </span>
            <span className="mt-4 block">
              <span
                dir="ltr"
                title={totalPrice.title}
                aria-label={totalPrice.ariaLabel}
                className="block min-w-0 break-words text-lg leading-tight font-bold tabular-nums text-slate-900"
              >
                {totalPrice.formatted}
              </span>
              <span className="mt-1 block text-xs font-semibold tracking-wide text-slate-600 uppercase">
                {indicativeTotalText}
              </span>
            </span>
          </span>
        </span>

        <span
          className={`flex min-h-12 items-center justify-center gap-2 px-4 py-3 text-center text-sm font-extrabold text-white ${selected ? "bg-blue-700" : "bg-navy"}`}
        >
          {selected ? <Check aria-hidden="true" className="size-5" /> : null}
          {selected ? selectedText : selectRoomText}
        </span>
      </label>
    </div>
  );
}
