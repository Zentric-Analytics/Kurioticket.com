"use client";

import { BrandedLoading } from "@/components/layout/BrandedLoading";

export function CarsRouteLoadingOverlay({
  active,
}: {
  active: boolean;
}) {
  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[12050] bg-[#F5F7FB] lg:hidden"
      data-cars-route-loading
    >
      <BrandedLoading
        variant="fullscreen"
        searchType="car"
        visual="logoPulse"
        showProgress
        showActivityDots={false}
        accessibleProgress
        className="min-h-[100svh] w-full bg-[#F5F7FB] px-5"
        contentClassName="max-w-md text-center"
      />
    </div>
  );
}
