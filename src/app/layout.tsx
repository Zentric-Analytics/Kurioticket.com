import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { LocaleProvider } from "@/components/layout/LocaleProvider";
import { RegionProvider } from "@/components/region/RegionProvider";

import { REGION_COOKIE_KEY } from "@/config/regionConfig";

import {
  countryToRegion,
  normalizeRegion,
  type RegionMode,
} from "@/lib/region/detectRegion";


export const metadata: Metadata = {
  title: {
    default: "Curioticket | Find Cheap Flights Fast",
    template: "%s | Curioticket",
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

  const cookieRegion = normalizeRegion(
    cookieStore.get(REGION_COOKIE_KEY)?.value
  );

  const headerRegion = normalizeRegion(
    headerStore.get("x-curioticket-region")
  );

  const ipRegion = countryToRegion(
    headerStore.get("x-vercel-ip-country") ||
      headerStore.get("cf-ipcountry")
  );

  const initialRegion = (
    cookieRegion ||
    headerRegion ||
    ipRegion ||
    "US"
  ) as RegionMode;

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
            <RegionProvider initialMode={initialRegion}>
              {children}
            </RegionProvider>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}