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
        hotelResultsDesktopSticky
        mobileResultsTrailingActions
        mobileResultsSearch={
          <div
            data-hotel-results-mobile-nav-search
            className="flex h-12 w-full min-w-0 rounded-xl border border-[#D8E1EC] bg-[#F5F7FB] empty:hidden"
          />
        }
        mobileResultsFilters={
          <div
            data-hotel-results-mobile-nav-filters
            className="w-full overflow-hidden bg-white empty:hidden"
          />
        }
      />
      <SearchResultsLoadingTransition searchType="hotel" />
    </>
  );
}
