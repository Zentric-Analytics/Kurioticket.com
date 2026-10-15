import { AppHeader } from "@/components/layout/AppHeader";
import { SearchResultsLoadingTransition } from "@/components/layout/SearchResultsLoadingTransition";

export default function PageLoading() {
  return (
    <>
      <AppHeader
        flushDesktopBottom
        flushMobileBottom
        hideDesktopTravelNav
        hideMobileCategoryTabs
        hideMobileResultsNavbarDivider
        hotelDesktopBoundary
        flightResultsDesktopSticky
        mobileResultsTrailingActions
        mobileResultsSearch={
          <div
            data-flight-results-mobile-nav-summary
            className="flex h-12 w-full min-w-0 overflow-visible rounded-xl bg-[#F5F7FB] empty:hidden"
          />
        }
        mobileResultsFilters={
          <div
            data-flight-results-mobile-nav-filters
            className="w-full overflow-hidden bg-white empty:hidden"
          />
        }
      />
      <SearchResultsLoadingTransition searchType="flight" />
    </>
  );
}
