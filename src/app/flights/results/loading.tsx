import { AppHeader } from "@/components/layout/AppHeader";
import { BrandedLoading } from "@/components/layout/BrandedLoading";

export default function PageLoading() {
  return (
    <>
      <AppHeader
        flushDesktopBottom
        flushMobileBottom
        hideDesktopTravelNav
        hideMobileCategoryTabs
      />
      <main className="min-h-[calc(100svh-5rem)] bg-[radial-gradient(circle_at_top_left,rgba(92,182,178,0.06),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(0,75,184,0.05),transparent_40%),linear-gradient(180deg,#F8FAFC_0%,#FFFFFF_100%)]">
        <BrandedLoading
          variant="fullscreen"
          visual="logoPulse"
          showProgress={false}
          className="min-h-[calc(100svh-5rem)] bg-transparent px-5"
          contentClassName="max-w-md text-center"
          searchType="flight"
        />
      </main>
    </>
  );
}
