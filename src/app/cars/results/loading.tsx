import { AppHeader } from "@/components/layout/AppHeader";
import { SearchResultsLoadingTransition } from "@/components/layout/SearchResultsLoadingTransition";
import { CarsResultsMobileSafeArea } from "@/components/results/CarsResultsMobileSafeArea";

export default function Loading() {
  return (
    <>
      <CarsResultsMobileSafeArea />
      <AppHeader
        flushDesktopBottom
        flushMobileBottom
        hideDesktopTravelNav
        hideMobileCategoryTabs
        hotelDesktopBoundary
        carsResultsDesktopSticky
        carsResultsMobileInlineSearch
        stableMobileSafeAreaTop
      />
      <SearchResultsLoadingTransition searchType="car" />
    </>
  );
}
