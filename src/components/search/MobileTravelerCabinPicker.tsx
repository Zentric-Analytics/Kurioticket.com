"use client";

import {
  Armchair,
  Baby,
  Check,
  Lightbulb,
  Minus,
  Plus,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type MobileCabinClass = "economy" | "business" | "first";

export type MobileTravelerCabinStrings = {
  travelers: string;
  adults: string;
  adultDescription: string;
  children: string;
  childDescription: string;
  infants: string;
  infantDescription: string;
  cabinClass: string;
  economy: string;
  business: string;
  first: string;
  tip: string;
  baggageTip: string;
  decrease: (label: string) => string;
  increase: (label: string) => string;
};

type Props = {
  adults: number;
  children: number;
  infants: number;
  cabinClass: MobileCabinClass;
  maximumTravelers?: number;
  strings: MobileTravelerCabinStrings;
  onAdultsChange: (value: number) => void;
  onChildrenChange: (value: number) => void;
  onInfantsChange: (value: number) => void;
  onCabinClassChange: (value: MobileCabinClass) => void;
};

function ChildOutlineIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="15" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M11 14.5c1.6-1 3.1-2.7 3.8-4.6 1.2 2 3.4 3.7 6.2 4.4M12.5 18.5c1.9 1.6 5.1 1.6 7 0M8 13l-2.5 2.5M24 13l2.5 2.5M12 24.5v3M20 24.5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13" cy="16" r="1" fill="currentColor" />
      <circle cx="19" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

export function MobileTravelerCabinPicker({
  adults,
  children,
  infants,
  cabinClass,
  maximumTravelers = 9,
  strings,
  onAdultsChange,
  onChildrenChange,
  onInfantsChange,
  onCabinClassChange,
}: Props) {
  const total = adults + children + infants;
  const rows = [
    { key: "adults", label: strings.adults, description: strings.adultDescription, count: adults, minimum: 1, icon: <UserRound className="h-6 w-6" aria-hidden="true" /> },
    { key: "children", label: strings.children, description: strings.childDescription, count: children, minimum: 0, icon: <ChildOutlineIcon className="h-6 w-6" /> },
    { key: "infants", label: strings.infants, description: strings.infantDescription, count: infants, minimum: 0, icon: <Baby className="h-6 w-6" aria-hidden="true" /> },
  ] as const;

  const change = (key: (typeof rows)[number]["key"], direction: -1 | 1) => {
    if (key === "adults") {
      const next = Math.max(1, Math.min(maximumTravelers, adults + direction));
      onAdultsChange(next);
      if (infants > next) onInfantsChange(next);
    } else if (key === "children") {
      onChildrenChange(Math.max(0, Math.min(maximumTravelers, children + direction)));
    } else {
      onInfantsChange(Math.max(0, Math.min(adults, infants + direction)));
    }
  };

  const cabins = [
    ["economy", strings.economy],
    ["business", strings.business],
    ["first", strings.first],
  ] as const;

  return (
    <div className="mx-auto w-full max-w-xl pb-2" data-mobile-traveler-cabin-content>
      <section aria-labelledby="mobile-travelers-heading">
        <h3 id="mobile-travelers-heading" className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          {strings.travelers}
        </h3>
        <div className="overflow-hidden rounded-[11px] border border-slate-200 bg-white">
          {rows.map((row) => {
            const canDecrease = row.count > row.minimum;
            const canIncrease = total < maximumTravelers && (row.key !== "infants" || infants < adults);
            return (
              <div key={row.key} data-traveler-row={row.key} className="flex min-h-[88px] items-center gap-2 border-b border-slate-200 px-[14px] last:border-b-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-950">{row.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold text-slate-950">{row.label}</span>
                  <span className="mt-0.5 block text-[12px] font-medium leading-[16px] text-slate-600">{row.description}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <button type="button" aria-label={strings.decrease(row.label)} disabled={!canDecrease} onClick={() => change(row.key, -1)} className="group focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full bg-transparent text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-500 bg-white group-disabled:border-slate-200">
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </button>
                  <span aria-live="polite" className="min-w-7 text-center text-[16px] font-bold tabular-nums text-slate-950">{row.count}</span>
                  <button type="button" aria-label={strings.increase(row.label)} disabled={!canIncrease} onClick={() => change(row.key, 1)} className="group focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full bg-transparent text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-500 bg-white group-disabled:border-slate-200">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-5" aria-labelledby="mobile-cabin-heading">
        <h3 id="mobile-cabin-heading" className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{strings.cabinClass}</h3>
        <div role="radiogroup" aria-labelledby="mobile-cabin-heading" className="grid h-[96px] grid-cols-3 overflow-hidden rounded-[10px] border border-slate-200 bg-white">
          {cabins.map(([value, label], index) => {
            const selected = cabinClass === value;
            return (
              <button key={value} type="button" role="radio" aria-checked={selected} onClick={() => onCabinClassChange(value)} className={cn("focus-ring relative flex min-w-0 flex-col items-center justify-center gap-2 border-slate-200 px-1 text-[13px] font-semibold text-slate-950", index > 0 && "border-s", selected && "z-10 border-[1.5px] border-[#075ee8] bg-[#eff6ff] text-[#075ee8]") }>
                {selected ? <span aria-hidden="true" className="absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#075ee8] text-white"><Check className="h-[14px] w-[14px]" /></span> : null}
                <Armchair className="h-[26px] w-[26px]" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="mt-4 flex items-center gap-2.5 rounded-[11px] bg-[#eff6ff] p-3 text-slate-900">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-[#075ee8]"><Lightbulb className="h-5 w-5" aria-hidden="true" /></span>
        <p className="text-[13px] font-medium leading-[1.45]"><strong className="font-bold">{strings.tip}:</strong> {strings.baggageTip}</p>
      </aside>
    </div>
  );
}
