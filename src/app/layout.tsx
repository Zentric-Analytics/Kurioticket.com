import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { CurrencyRatesProvider } from "@/components/currency/CurrencyRatesProvider";
import { LocaleProvider } from "@/components/layout/LocaleProvider";
import { NewsletterSessionBridge } from "@/components/newsletter/NewsletterSessionBridge";
import { RegionProvider } from "@/components/region/RegionProvider";
import { RouteProgressProvider } from "@/components/layout/RouteProgress";

import { REGION_COOKIE_KEY, REGION_OVERRIDE_COOKIE_KEY } from "@/config/regionConfig";

import { extractVisitorIp, resolveIpinfoLiteCountryContext } from "@/lib/geo/ipinfo";
import {
  countryToRegion,
  normalizeRegion,
  type RegionMode,
} from "@/lib/region/detectRegion";


export const metadata: Metadata = {
  title: {
    default: "Kurioticket | Find Cheap Flights Fast",
    template: "%s | Kurioticket",
  },
  description:
    "Compare affordable flights and hotels in seconds with a calmer travel decision platform.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const selectedRegion = normalizeRegion(
    cookieStore.get(REGION_OVERRIDE_COOKIE_KEY)?.value
  );

  const platformRegion = countryToRegion(
    headerStore.get("x-vercel-ip-country") ||
      headerStore.get("cf-ipcountry") ||
      headerStore.get("x-country")
  );

  const detectedHeaderRegion = normalizeRegion(
    headerStore.get("x-kurioticket-detected-region")
  );

  const visitorIp = extractVisitorIp(headerStore);
  const ipinfoCountryContext = !platformRegion && !detectedHeaderRegion && visitorIp
    ? await resolveIpinfoLiteCountryContext(visitorIp)
    : null;
  const ipinfoRegion = ipinfoCountryContext?.countryCode
    ? countryToRegion(ipinfoCountryContext.countryCode)
    : null;

  const cookieRegion = normalizeRegion(
    cookieStore.get(REGION_COOKIE_KEY)?.value
  );

  const detectedRegion = (
    platformRegion ||
    detectedHeaderRegion ||
    ipinfoRegion ||
    cookieRegion ||
    null
  ) as RegionMode | null;

  const initialRegion = (selectedRegion || detectedRegion || "US") as RegionMode;

  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-scroll-behavior="smooth"
    >
      <body
        className="flex min-h-full flex-col"
      >
        <AuthProvider>
          <LocaleProvider>
            <RegionProvider initialMode={initialRegion} detectedMode={detectedRegion}>
              <CurrencyRatesProvider>
                <RouteProgressProvider>
                  <NewsletterSessionBridge />
                  {children}
                </RouteProgressProvider>
              </CurrencyRatesProvider>
            </RegionProvider>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
