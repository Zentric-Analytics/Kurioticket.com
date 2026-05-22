"use client";

import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";

import { cn } from "@/lib/utils";

type DateRangePickerProps = {
  label: string;
  placeholder: string;
  value?: DateRange;
  minDate?: Date;
  disabled?: boolean;
  onChange: (value: DateRange | undefined) => void;
};

const prettyDate = (date?: Date) => (date ? format(date, "MMM d, yyyy") : "");

export function DateRangePicker({
  label,
  placeholder,
  value,
  minDate,
  disabled = false,
  onChange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const displayValue =
    value?.from && value?.to
      ? `${prettyDate(value.from)} – ${prettyDate(value.to)}`
      : value?.from
        ? `${prettyDate(value.from)} –`
        : "";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((previous) => !previous)}
        className={cn(
          "focus-ring flex h-11 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-left text-sm font-semibold transition-colors",
          displayValue ? "text-slate-900" : "text-slate-500",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="truncate">{displayValue || placeholder}</span>
        <CalendarDays className="h-4 w-4 text-slate-500" aria-hidden="true" />
      </button>

      <span className="sr-only">{label}</span>

      <div
        className={cn(
          "pointer-events-none absolute left-0 top-[calc(100%+8px)] z-50 w-full min-w-[290px] origin-top rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition-all duration-200 md:w-auto",
          open && "pointer-events-auto scale-100 opacity-100",
          !open && "scale-95",
        )}
      >
        <DayPicker
          mode="range"
          required
          numberOfMonths={1}
          disabled={{ before: minDate ?? new Date() }}
          selected={value}
          onSelect={(range) => {
            onChange(range);
            if (range?.from && range?.to) {
              setOpen(false);
            }
          }}
          className="text-sm"
          classNames={{
            day_button:
              "h-10 w-10 rounded-full font-medium aria-selected:bg-[#5b21d6] aria-selected:text-white hover:bg-violet-50",
            range_start: "bg-[#5b21d6] text-white rounded-full",
            range_end: "bg-[#5b21d6] text-white rounded-full",
            range_middle: "bg-violet-100 text-[#5b21d6]",
            today: "text-[#5b21d6]",
            months: "flex",
            month: "space-y-2",
            caption_label: "font-bold text-slate-900",
            nav_button: "h-8 w-8 rounded-full border border-slate-200 hover:bg-slate-100",
          }}
        />
      </div>
    </div>
  );
}
