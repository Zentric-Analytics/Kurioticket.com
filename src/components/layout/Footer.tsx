"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export function Footer() {
  const { data: session } =
    useSession();

  const isSignedIn = Boolean(
    session?.user
  );

  const currentYear =
    new Date().getFullYear();

  const footerSections = [
    {
      heading: "Contact Us",
      links: [
        {
          label: "Customer support",
          href: "/support",
        },
        {
          label: "Service Guarantee",
          href: "/service-guarantee",
        },
        {
          label: "More Service Info",
          href: "/more-service-info",
        },
      ],
    },
    {
      heading: "Discover",
      links: [
        {
          label: "Flights",
          href: "/flights/results",
        },
        {
          label: "Hotels",
          href: "/hotels/results",
        },
        {
          label: "Cars",
          href: "/cars",
        },
        {
          label: "Deals",
          href: "/deals",
        },
        {
          label: "Destinations",
          href: "/destinations",
        },
        {
          label: "Explore",
          href: "/explore",
        },
        ...(isSignedIn
          ? [
              {
                label: "Dashboard",
                href: "/dashboard",
              },
            ]
          : []),
      ],
    },
    {
      heading: "Terms and settings",
      links: [
        {
          label: "Privacy Policy",
          href: "/legal/privacy-policy",
        },
        {
          label: "Terms of Service",
          href: "/legal/terms-of-service",
        },
        {
          label: "Cookie Policy",
          href: "/legal/cookie-policy",
        },
      ],
    },
    {
      heading: "About Curioticket",
      links: [
        {
          label: "About Us",
          href: "/about",
        },
        {
          label: "How Curioticket Works",
          href: "/how-it-works",
        },
      ],
    },
  ];

  const [aboutSection, ...linkSections] =
    footerSections;

  return (
    <footer className="border-t border-slate-200 bg-white text-slate-700">
      <div className="page-shell py-10 md:py-12">
        <div className="hidden gap-x-8 gap-y-8 lg:grid lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,0.85fr)] xl:gap-x-12">
          {footerSections.map(
            (section) => (
              <div key={section.heading}>
                <h2 className="text-sm font-semibold text-slate-900">
                  {section.heading}
                </h2>

                <div className="mt-3 grid gap-2 text-sm text-slate-600">
                  {section.links.map(
                    (link) => (
                      <Link
                        key={`${section.heading}-${link.label}`}
                        href={link.href}
                        className="transition-colors hover:text-indigo-600"
                      >
                        {link.label}
                      </Link>
                    )
                  )}
                </div>
              </div>
            )
          )}
        </div>

        <div className="space-y-7 lg:hidden">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {aboutSection.heading}
            </h2>

            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              {aboutSection.links.map(
                (link) => (
                  <Link
                    key={`${aboutSection.heading}-${link.label}`}
                    href={link.href}
                    className="transition-colors hover:text-indigo-600"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-t border-slate-200 pt-6 sm:grid-cols-3">
            {linkSections.map(
              (section) => (
                <div key={section.heading} className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {section.heading}
                  </h2>

                  <div className="mt-3 grid gap-2 text-sm text-slate-600">
                    {section.links.map(
                      (link) => (
                        <Link
                          key={`${section.heading}-${link.label}`}
                          href={link.href}
                          className="break-words transition-colors hover:text-indigo-600"
                        >
                          {link.label}
                        </Link>
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-5">
          <div className="flex flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                Curioticket
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Search flights, hotels, and travel deals with confidence.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <p>
                © {currentYear} Curioticket. All rights reserved.
              </p>

              <Link href="/legal/privacy-policy" className="transition-colors hover:text-indigo-600">
                Privacy
              </Link>

              <Link href="/legal/terms-of-service" className="transition-colors hover:text-indigo-600">
                Terms
              </Link>

              <Link href="/legal/cookie-policy" className="transition-colors hover:text-indigo-600">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
