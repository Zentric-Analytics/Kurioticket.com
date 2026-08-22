"use client";

import { Baby, BedDouble, Check, Minus, Plus, UserRound } from "lucide-react";
import type { ReactNode } from "react";

type Strings = {
  adults: string;
  adultDescription: string;
  children: string;
  childDescription: string;
  infants: string;
  infantDescription: string;
  rooms: string;
  roomDescription: string;
  petFriendly: string;
  petDescription: string;
  decrease: (label: string) => string;
  increase: (label: string) => string;
};

type Props = {
  adults: number;
  children: number;
  infants: number;
  rooms: number;
  petFriendly: boolean;
  includeFlight: boolean;
  includeHotel: boolean;
  strings: Strings;
  onAdultsChange: (value: number) => void;
  onChildrenChange: (value: number) => void;
  onInfantsChange: (value: number) => void;
  onRoomsChange: (value: number) => void;
  onPetFriendlyChange: (value: boolean) => void;
};

function ChildOutlineIcon() {
  return <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className="h-6 w-6"><circle cx="16" cy="15" r="8" stroke="currentColor" strokeWidth="2"/><path d="M11 14.5c1.6-1 3.1-2.7 3.8-4.6 1.2 2 3.4 3.7 6.2 4.4M12.5 18.5c1.9 1.6 5.1 1.6 7 0M8 13l-2.5 2.5M24 13l2.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="13" cy="16" r="1" fill="currentColor"/><circle cx="19" cy="16" r="1" fill="currentColor"/></svg>;
}

function Counter({ value, minimum, maximum, label, strings, onChange }: { value: number; minimum: number; maximum: number; label: string; strings: Strings; onChange: (value: number) => void }) {
  const button = (direction: -1 | 1) => {
    const disabled = direction < 0 ? value <= minimum : value >= maximum;
    return <button type="button" disabled={disabled} aria-label={(direction < 0 ? strings.decrease : strings.increase)(label)} onClick={() => onChange(Math.max(minimum, Math.min(maximum, value + direction)))} className="group focus-ring flex h-11 w-11 items-center justify-center rounded-full text-[#075ee8] disabled:cursor-not-allowed disabled:text-slate-300"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#075ee8]/75 bg-white group-disabled:border-slate-200">{direction < 0 ? <Minus aria-hidden="true" className="h-4 w-4"/> : <Plus aria-hidden="true" className="h-4 w-4"/>}</span></button>;
  };
  return <span className="flex shrink-0 items-center gap-1.5">{button(-1)}<span aria-live="polite" className="min-w-7 text-center text-[16px] font-bold tabular-nums text-slate-950">{value}</span>{button(1)}</span>;
}

function Row({ icon, label, description, counter }: { icon: ReactNode; label: string; description: string; counter: ReactNode }) {
  return <div className="flex min-h-[84px] items-center gap-2.5 border-b border-slate-200 px-[14px] py-2.5 last:border-b-0"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#075ee8]">{icon}</span><span className="min-w-0 flex-1"><span className="block text-[15px] font-bold text-slate-950">{label}</span><span className="mt-0.5 block text-[12px] font-medium leading-4 text-slate-600">{description}</span></span>{counter}</div>;
}

export function MobilePackageTravelersRoomsPicker(props: Props) {
  const { adults, children, infants, rooms, petFriendly, includeFlight, includeHotel, strings } = props;
  const total = adults + children + infants;
  const maximum = includeFlight ? 9 : 12;
  return <div className="mx-auto w-full max-w-xl pb-2" data-mobile-package-travelers-rooms>
    <div className="overflow-hidden rounded-[11px] border border-slate-200 bg-white">
      <Row icon={<UserRound aria-hidden="true" className="h-[22px] w-[22px]"/>} label={strings.adults} description={strings.adultDescription} counter={<Counter value={adults} minimum={1} maximum={adults + (maximum - total)} label={strings.adults} strings={strings} onChange={(value) => { props.onAdultsChange(value); if (infants > value) props.onInfantsChange(value); }}/>} />
      <Row icon={<ChildOutlineIcon/>} label={strings.children} description={strings.childDescription} counter={<Counter value={children} minimum={0} maximum={children + (maximum - total)} label={strings.children} strings={strings} onChange={props.onChildrenChange}/>} />
      <Row icon={<Baby aria-hidden="true" className="h-6 w-6"/>} label={strings.infants} description={strings.infantDescription} counter={<Counter value={infants} minimum={0} maximum={Math.min(adults, infants + (maximum - total))} label={strings.infants} strings={strings} onChange={props.onInfantsChange}/>} />
    </div>
    {includeHotel ? <div className="mt-5 overflow-hidden rounded-[11px] border border-slate-200 bg-white">
      <Row icon={<BedDouble aria-hidden="true" className="h-[22px] w-[22px]"/>} label={strings.rooms} description={strings.roomDescription} counter={<Counter value={rooms} minimum={1} maximum={6} label={strings.rooms} strings={strings} onChange={props.onRoomsChange}/>} />
      <label className="flex min-h-[80px] cursor-pointer items-center gap-3 px-[14px] py-3"><input type="checkbox" checked={petFriendly} onChange={(event) => props.onPetFriendlyChange(event.target.checked)} className="peer sr-only"/><span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-slate-400 bg-white text-white peer-checked:border-[#075ee8] peer-checked:bg-[#075ee8]"><Check className="h-4 w-4"/></span><span><span className="block text-[15px] font-bold text-slate-950">{strings.petFriendly}</span><span className="mt-0.5 block text-[12px] font-medium leading-4 text-slate-600">{strings.petDescription}</span></span></label>
    </div> : null}
  </div>;
}
