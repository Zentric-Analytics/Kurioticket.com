import { AppHeader } from "@/components/layout/AppHeader";
import { HotelDetailsLoadingState } from "@/components/results/hotelDetails/HotelDetailsPageStates";

export default function LoadingHotelDetailsRoute() {
  return (
    <>
      <AppHeader
        flushDesktopBottom
        flushMobileBottom
        hideDesktopTravelNav
        hideMobileCategoryTabs
      />
      <HotelDetailsLoadingState loadingText="Loading hotel details…" />
    </>
  );
}
