"use client";

import Link from "next/link";

import { KurioticketLogo } from "@/components/brand/KurioticketLogo";
import { useLocale } from "@/components/layout/LocaleProvider";

export function Footer() {
  const { t } = useLocale();
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      heading: t.footerContactUs,
      links: [
        {
          label: t.footerCustomerSupport,
          href: "/support",
        },
        {
          label: t.footerServiceGuarantee,
          href: "/service-guarantee",
        },
        {
          label: t.footerMoreServiceInfo,
          href: "/more-service-info",
        },
      ],
    },
    {
      heading: t.footerDiscover,
      links: [
        {
          label: t.flights,
          href: "/flights",
        },
        {
          label: t.hotels,
          href: "/hotels/results",
        },
        {
          label: t.cars,
          href: "/cars",
        },
        {
          label: t.deals,
          href: "/deals",
        },
        {
          label: t.destinations,
          href: "/destinations",
        },
        {
          label: t.footerSavedRecent,
          href: "/saved",
        },
      ],
    },
    {
      heading: t.footerTermsSettings,
      links: [
        {
          label: t.footerPrivacyPolicy,
          href: "/legal/privacy-policy",
        },
        {
          label: t.footerTermsOfService,
          href: "/legal/terms-of-service",
        },
        {
          label: t.footerCookiePolicy,
          href: "/legal/cookie-policy",
        },
        {
          label: t.legalCenter,
          href: "/legal-center",
        },
      ],
    },
    {
      heading: t.footerAboutKurioticket,
      links: [
        {
          label: t.footerAboutUs,
          href: "/about",
        },
        {
          label: t.footerHowItWorks,
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
                {t.footerConfidenceTagline}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <p>
                © {currentYear} Kurioticket LLC.{" "}
                {t.footerAllRightsReserved}
              </p>

              <Link
                href="/legal/privacy-policy"
                className="transition-colors hover:text-indigo-600"
              >
                {t.footerPrivacy}
              </Link>

              <Link
                href="/legal/terms-of-service"
                className="transition-colors hover:text-indigo-600"
              >
                {t.footerTerms}
              </Link>

              <Link
                href="/legal/cookie-policy"
                className="transition-colors hover:text-indigo-600"
              >
                {t.footerCookies}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
