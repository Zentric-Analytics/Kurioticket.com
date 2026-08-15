import { Building2, CarFront, Plane } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type PackagesIconProps = ComponentPropsWithoutRef<"span"> & {
  size?: number | string;
  strokeWidth?: number;
};

/** The canonical customer-facing mark for the combined Flights + Hotels + Cars product. */
export function PackagesIcon({ className, size, strokeWidth, style, ...props }: PackagesIconProps) {
  return (
    <span
      {...props}
      aria-hidden="true"
      data-packages-icon="flight-hotel-car"
      className={cn("relative inline-block shrink-0 text-current", className)}
      style={{ width: size, height: size, ...style }}
    >
      <Building2 aria-hidden="true" className="absolute left-[27%] top-0 h-[68%] w-[68%]" strokeWidth={strokeWidth ?? 1.8} />
      <Plane aria-hidden="true" className="absolute bottom-0 left-0 h-[58%] w-[58%] -rotate-12" strokeWidth={strokeWidth ?? 2} />
      <CarFront aria-hidden="true" className="absolute bottom-0 right-0 h-1/2 w-1/2" strokeWidth={strokeWidth ?? 2} />
    </span>
  );
}
