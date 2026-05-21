import type { Metadata } from "next";

import "./globals.css";

import { AuthProvider } from "@/components/auth/AuthProvider";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-scroll-behavior="smooth"
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
