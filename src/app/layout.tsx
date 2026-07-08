import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";

import { AccountCustomizationHydrator } from "@/components/account/AccountCustomizationHydrator";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { CurrencyRatesProvider } from "@/components/currency/CurrencyRatesProvider";
import { LocaleProvider } from "@/components/layout/LocaleProvider";
import { NewsletterSessionBridge } from "@/components/newsletter/NewsletterSessionBridge";
import { RegionProvider } from "@/components/region/RegionProvider";
import { RouteProgressProvider } from "@/components/layout/RouteProgress";

import { REGION_COOKIE_KEY, REGION_OVERRIDE_COOKIE_KEY } from "@/config/regionConfig";

import { extractVisitorIp, resolveIpinfoLiteCountryContext } from "@/lib/geo/ipinfo";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";
import {
  countryToRegion,
  normalizeRegion,
  type RegionMode,
} from "@/lib/region/detectRegion";


export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return {
    title: {
      default: t["metadata.root.title.default"],
      template: "%s | Kurioticket",
    },
    description: t["metadata.root.description"],
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    ),
    icons: {
      icon: [
        {
          url: "/brand/kurioticket-favicon.svg",
          type: "image/svg+xml",
        },
        {
          url: "/brand/kurioticket-favicon-32.png",
          sizes: "32x32",
          type: "image/png",
        },
      ],
      apple: [
        {
          url: "/brand/kurioticket-apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    manifest: "/manifest.json",
  };
}

export const viewport: Viewport = {
  themeColor: "#021C2B",
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
              <AccountCustomizationHydrator />
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
