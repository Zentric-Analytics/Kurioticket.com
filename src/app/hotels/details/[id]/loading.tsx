import { AppHeader } from "@/components/layout/AppHeader";
import { HotelDetailsLoadingState } from "@/components/results/hotelDetails/HotelDetailsPageStates";

export default function LoadingHotelDetailsRoute() {
  return (
    <>
      <div className="hidden lg:block" data-hotel-details-desktop-header>
        <AppHeader
          flushDesktopBottom
          flushMobileBottom
          hideDesktopTravelNav
          hideMobileCategoryTabs
        />
      </div>
      <div
        className="pt-[env(safe-area-inset-top)] lg:pt-0"
        data-hotel-details-mobile-safe-area
      >
        <HotelDetailsLoadingState loadingText="Loading hotel details…" />
      </div>
    </>
  );
}
