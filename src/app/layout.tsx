import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import "./globals.css";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { RegionProvider } from "@/components/region/RegionProvider";
import { REGION_COOKIE_KEY, type RegionMode } from "@/config/regionConfig";
import { countryToRegion, normalizeRegion } from "@/lib/region/detectRegion";

const geistSans = Geist({
  variable:
    "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono =
  Geist_Mono({
    variable:
      "--font-geist-mono",
    subsets: ["latin"],
  });

export const metadata: Metadata =
  {
    title: {
      default:
        "Curioticket | Find Cheap Flights Fast",
      template:
        "%s | Curioticket",
    },

    description:
      "Compare affordable flights and hotels in seconds with a calmer travel decision platform.",

    metadataBase:
      new URL(
        process.env
          .NEXT_PUBLIC_APP_URL ||
          "http://localhost:3000",
      ),
  };

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieRegion = normalizeRegion(cookieStore.get(REGION_COOKIE_KEY)?.value);
  const headerRegion = normalizeRegion(headerStore.get("x-curioticket-region"));
  const ipRegion = countryToRegion(headerStore.get("x-vercel-ip-country") || headerStore.get("cf-ipcountry"));
  const initialRegion = (cookieRegion || headerRegion || ipRegion || "GLOBAL") as RegionMode;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <RegionProvider initialMode={initialRegion}>{children}</RegionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}