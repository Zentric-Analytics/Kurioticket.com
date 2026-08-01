import Image from "next/image";
import Link from "next/link";
import { BedDouble, ImageOff } from "lucide-react";
import type { DealsPackageCardView } from "@/lib/deals/dealsPackageCardPresentation";

type Props = { hotel: NonNullable<DealsPackageCardView["hotel"]>; headingId: string; t: (key: string) => string };

export function DealsPackageHotelSummary({ hotel, headingId, t }: Props) {
  return (
    <section aria-labelledby={`${headingId}-hotel`} className="py-4">
      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-4">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
          {hotel.image ? <Image src={hotel.image} alt="" fill sizes="112px" className="object-cover" /> : <div className="flex h-full items-center justify-center"><ImageOff aria-label={t("deals.results.package.imageUnavailable")} className="h-5 w-5 text-slate-400" /></div>}
        </div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id={`${headingId}-hotel`} className="flex items-center gap-2 text-sm font-extrabold text-slate-950"><BedDouble aria-hidden className="h-4 w-4 text-[#004BB8]" />{t("deals.results.package.hotel")}</h3>
              <p className="mt-1 truncate font-bold text-slate-950">{hotel.name}</p>
            </div>
            {hotel.detailsPath && <Link href={hotel.detailsPath} className="shrink-0 text-xs font-semibold text-[#004BB8] hover:underline focus-visible:outline focus-visible:outline-2">{t("deals.results.package.details.hotel")}</Link>}
          </div>
          <p className="mt-1 text-xs text-slate-600">{hotel.ratingLabel}{hotel.location ? ` · ${hotel.location}` : ""}</p>
          <div className="mt-2 space-y-0.5 text-sm text-slate-700">
            <p className="font-semibold">{hotel.roomLabel}</p>
            <p>{hotel.stayLabel}</p>
            {hotel.cancellation && <p className="text-xs text-slate-500">{hotel.cancellation}</p>}
            {hotel.amenities.length > 0 && <p className="text-xs text-slate-500">{hotel.amenities.join(" · ")}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
