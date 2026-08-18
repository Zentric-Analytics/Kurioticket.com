import { cookies } from "next/headers";

import { BrandedLoading } from "@/components/layout/BrandedLoading";
import { getTranslations } from "@/lib/i18n";
import { translations as enTranslations } from "@/lib/i18n/en";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

export default async function Loading() {
  const t = getTranslations((await cookies()).get(LOCALE_COOKIE_KEY)?.value);

  return (
    <main className="min-h-[100svh] bg-[radial-gradient(circle_at_top_left,rgba(92,182,178,0.06),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(0,75,184,0.05),transparent_40%),linear-gradient(180deg,#F8FAFC_0%,#FFFFFF_100%)]">
      <BrandedLoading
        variant="fullscreen"
        visual="logoPulse"
        showProgress={false}
        className="min-h-[100svh] bg-transparent px-5"
        contentClassName="max-w-md text-center"
        title={
          t["carsResults.loading.title"] ??
          enTranslations["carsResults.loading.title"]
        }
        messages={[
          t["carsResults.loading.checkingCarsAndRates"] ??
            enTranslations["carsResults.loading.checkingCarsAndRates"],
          t["carsResults.loading.comparingVehiclesAndProviders"] ??
            enTranslations["carsResults.loading.comparingVehiclesAndProviders"],
          t["carsResults.loading.findingBestAvailableOptions"] ??
            enTranslations["carsResults.loading.findingBestAvailableOptions"],
          t["carsResults.loading.preparingResults"] ??
            enTranslations["carsResults.loading.preparingResults"],
        ]}
      />
    </main>
  );
}
