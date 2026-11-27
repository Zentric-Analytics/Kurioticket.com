import Link from "next/link";
import { Monitor, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { AccessPreview } from "./AdminUnifiedActivityList";

/** Latest access is identity context, not another recent action. */
export function AdminActivityAccessSummary({ access, timeZone, unavailable, location, href }: {
  access: AccessPreview | null; timeZone: string; unavailable?: boolean; location?: ReactNode; href?: string;
}) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false,timeZone,
  });
  return <section aria-label="Latest device and access" className="min-w-0 rounded-lg bg-[#F8FAFC] px-3 py-2.5">
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 basis-full items-start gap-2.5 sm:flex-1 sm:basis-0">
        <Monitor aria-hidden="true" size={17} className="mt-0.5 shrink-0 text-[#64748B]"/>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <h2 className="text-[12px] font-medium text-[#334155]">{access?.label ?? "Latest recorded access"}</h2>
            {access ? <time dateTime={access.at.toISOString()} className="text-[12px] tabular-nums text-[#64748B]">{date.format(access.at)}</time> : null}
          </div>
          <p className="break-words text-[13px] leading-5 text-[#475569]">{access?.detail || (unavailable ? "Access information is temporarily unavailable." : "No recorded device or access observation.")}</p>
          {location}
        </div>
      </div>
      {href ? <Link href={href} className="focus-ring inline-flex min-h-11 w-full items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-[#004BB8] hover:bg-[#F1F6FF] sm:w-auto">Device & Access history <ChevronRight size={14} aria-hidden="true"/></Link> : null}
    </div>
  </section>;
}
