"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { KurioticketLogo } from "@/components/brand/KurioticketLogo";
import { useLocale } from "@/components/layout/LocaleProvider";
import {
  getCaliforniaSellerOfTravelNotice,
  legalProfile,
} from "@/data/legalProfile";

export type FooterVariant = "full" | "brand-legal-only";

type FooterSectionId = "contact" | "discover" | "terms-settings" | "about";

export function Footer({ variant = "full" }: { variant?: FooterVariant }) {
  const { t } = useLocale();
  const currentYear = new Date().getFullYear();
  const [openMobileSection, setOpenMobileSection] =
    useState<FooterSectionId | null>(null);
  const sellerOfTravelNotice =
    t.footerSellerOfTravelNotice ||
    `${legalProfile.company.legalName} — ${getCaliforniaSellerOfTravelNotice()}`;

  const footerSections = [
    {
      id: "contact" as const,
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
      id: "discover" as const,
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
          href: "/packages",
        },
        {
          label: t.destinations,
          href: "/destinations",
        },
        {
          label: t["accountMenu.savedRecent.label"],
          href: "/saved",
        },
      ],
    },
    {
      id: "terms-settings" as const,
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
          href: "/legal",
        },
      ],
    },
    {
      id: "about" as const,
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

  return (
    <footer className="border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] text-slate-700">
      <div
        className={
          variant === "full"
            ? "page-shell py-6 sm:py-8 lg:py-12"
            : "page-shell py-8"
        }
      >
        {variant === "full" ? (
          <>
            <div className="hidden gap-x-8 gap-y-8 lg:grid lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,0.85fr)] xl:gap-x-12">
              {footerSections.map((section) => (
                <div key={section.id}>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {section.heading}
                  </h2>

                  <div className="mt-3 grid gap-2 text-sm text-slate-600">
                    {section.links.map((link) => (
                      <Link
                        key={`${section.heading}-${link.label}`}
                        href={link.href}
                        className="transition-colors hover:text-[#004BB8]"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 lg:hidden">
              {footerSections.map((section) => {
                const isOpen = openMobileSection === section.id;
                const panelId = `footer-mobile-panel-${section.id}`;

                return (
                  <section key={section.id} className="border-b border-slate-200">
                    <h2>
                      <button
                        id={`footer-mobile-trigger-${section.id}`}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() =>
                          setOpenMobileSection(isOpen ? null : section.id)
                        }
                        className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-start text-sm font-semibold text-slate-900"
                      >
                        <span className="min-w-0">{section.heading}</span>
                        <ChevronDown
                          aria-hidden="true"
                          className={`size-4 shrink-0 text-slate-500 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </h2>

                    {isOpen ? (
                      <div
                        id={panelId}
                        aria-labelledby={`footer-mobile-trigger-${section.id}`}
                        className="grid gap-2 pb-4 ps-1 text-sm leading-5 text-slate-600"
                      >
                        {section.links.map((link) => (
                          <Link
                            key={`${section.id}-${link.href}`}
                            href={link.href}
                            className="break-words transition-colors hover:text-[#004BB8]"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </>
        ) : null}

        <div
          className={
            variant === "full"
              ? "mt-6 border-t border-slate-200 pt-5 lg:mt-10"
              : "pt-0"
          }
        >
          <div className="flex flex-col gap-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between md:gap-3">
            <div>
              <KurioticketLogo
                variant="full"
                tone="dark"
                className="h-7 w-auto sm:h-8 lg:h-9"
              />

              <p className="mt-1 text-xs text-slate-500">
                {t.footerConfidenceTagline}
              </p>

              <Link
                href="/legal"
                className="mt-3 block max-w-3xl text-xs leading-5 text-slate-500 transition-colors hover:text-[#004BB8]"
              >
                {sellerOfTravelNotice}
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <p>
                © {currentYear} Kurioticket LLC. {t.footerAllRightsReserved}
              </p>

              <Link
                href="/legal/privacy-policy"
                className="transition-colors hover:text-[#004BB8]"
              >
                {t.footerPrivacy}
              </Link>

              <Link
                href="/legal/terms-of-service"
                className="transition-colors hover:text-[#004BB8]"
              >
                {t.footerTerms}
              </Link>

              <Link
                href="/legal/cookie-policy"
                className="transition-colors hover:text-[#004BB8]"
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
