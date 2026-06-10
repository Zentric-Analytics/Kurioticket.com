"use client";

import Link from "next/link";

import { KurioticketLogo } from "@/components/brand/KurioticketLogo";
import { useLocale } from "@/components/layout/LocaleProvider";

export function Footer() {
  const { t } = useLocale();
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      heading: t.footerContactUs || "Contact Us",
      links: [
        {
          label: t.footerCustomerSupport || "Customer support",
          href: "/support",
        },
        {
          label: t.footerServiceGuarantee || "Service Guarantee",
          href: "/service-guarantee",
        },
        {
          label: t.footerMoreServiceInfo || "More Service Info",
          href: "/more-service-info",
        },
      ],
    },
    {
      heading: t.footerDiscover || "Discover",
      links: [
        {
          label: t.flights || "Flights",
          href: "/flights/results",
        },
        {
          label: t.hotels || "Hotels",
          href: "/hotels/results",
        },
        {
          label: t.cars || "Cars",
          href: "/cars",
        },
        {
          label: t.deals || "Deals",
          href: "/deals",
        },
        {
          label: t.destinations || "Destinations",
          href: "/destinations",
        },
        {
          label: t.footerSavedRecent || "Saved & recent",
          href: "/saved",
        },
      ],
    },
    {
      heading: t.footerTermsSettings || "Terms & Settings",
      links: [
        {
          label: t.footerPrivacyPolicy || "Privacy Policy",
          href: "/legal/privacy-policy",
        },
        {
          label: t.footerTermsOfService || "Terms of Service",
          href: "/legal/terms-of-service",
        },
        {
          label: t.footerCookiePolicy || "Cookie Policy",
          href: "/legal/cookie-policy",
        },
        {
          label: t.legalCenter || "Legal Center",
          href: "/legal-center",
        },
      ],
    },
    {
      heading: t.footerAboutKurioticket || "About Kurioticket",
      links: [
        {
          label: t.footerAboutUs || "About Us",
          href: "/about",
        },
        {
          label: t.footerHowItWorks || "How Kurioticket Works",
          href: "/how-it-works",
        },
      ],
    },
  ];

  const [aboutSection, ...linkSections] = footerSections;

  return (
    <footer className="border-t border-slate-200 bg-white text-slate-700">
      <div className="page-shell py-10 md:py-12">
        <div className="hidden gap-x-8 gap-y-8 lg:grid lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,0.85fr)] xl:gap-x-12">
          {footerSections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-sm font-semibold text-slate-900">
                {section.heading}
              </h2>

              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                {section.links.map((link) => (
                  <Link
                    key={`${section.heading}-${link.label}`}
                    href={link.href}
                    className="transition-colors hover:text-indigo-600"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-7 lg:hidden">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {aboutSection.heading}
            </h2>

            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              {aboutSection.links.map((link) => (
                <Link
                  key={`${aboutSection.heading}-${link.label}`}
                  href={link.href}
                  className="transition-colors hover:text-indigo-600"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-t border-slate-200 pt-6 sm:grid-cols-3">
            {linkSections.map((section) => (
              <div key={section.heading} className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900">
                  {section.heading}
                </h2>

                <div className="mt-3 grid gap-2 text-sm text-slate-600">
                  {section.links.map((link) => (
                    <Link
                      key={`${section.heading}-${link.label}`}
                      href={link.href}
                      className="break-words transition-colors hover:text-indigo-600"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-5">
          <div className="flex flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
            <div>
              <KurioticketLogo
                variant="full"
                tone="dark"
                markClassName="h-9 w-9"
                textClassName="text-base"
              />

              <p className="mt-1 text-xs text-slate-500">
                {t.footerConfidenceTagline ||
                  "Search flights, hotels, and travel deals with confidence."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <p>
                © {currentYear} Kurioticket LLC.{" "}
                {t.footerAllRightsReserved || "All rights reserved."}
              </p>

              <Link
                href="/legal/privacy-policy"
                className="transition-colors hover:text-indigo-600"
              >
                {t.footerPrivacy || "Privacy"}
              </Link>

              <Link
                href="/legal/terms-of-service"
                className="transition-colors hover:text-indigo-600"
              >
                {t.footerTerms || "Terms"}
              </Link>

              <Link
                href="/legal/cookie-policy"
                className="transition-colors hover:text-indigo-600"
              >
                {t.footerCookies || "Cookies"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
