"use client";

import { ArrowRight, Building2, FileText, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { Card } from "@/components/ui/Card";
import { legalProfile } from "@/data/legalProfile";
import { translations as enTranslations } from "@/lib/i18n/en";
import type { LegalDocument } from "@/lib/types";

type LegalPageContentProps = {
  documents: LegalDocument[];
};

const legalIndexDocumentKeys: Record<string, string> = {
  "terms-of-service": "termsOfService",
  "privacy-policy": "privacyPolicy",
  "cookie-policy": "cookiePolicy",
  "affiliate-disclosure": "affiliateDisclosure",
  "refund-booking-disclaimer": "refundBookingDisclaimer",
  "acceptable-use-policy": "acceptableUsePolicy",
  "data-deletion-policy": "dataDeletionPolicy",
  "price-availability-disclaimer": "priceAvailabilityDisclaimer",
  "partner-redirect-disclaimer": "partnerRedirectDisclaimer",
};

const legalCenterDescription =
  "Kurioticket’s legal resources explain how our travel search, account, privacy, provider redirect, and compliance practices work.";

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

export function LegalPageContent({ documents }: LegalPageContentProps) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const sellerOfTravel = legalProfile.californiaSellerOfTravel;
  const contacts = [
    { label: "Support", email: legalProfile.contact.supportEmail },
    { label: "Legal", email: legalProfile.contact.legalEmail },
    { label: "Privacy", email: legalProfile.contact.privacyEmail },
  ];

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-24 pb-10 sm:pt-28 lg:pt-28">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-white via-teal/5 to-surface-muted p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full bg-teal/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-dark ring-1 ring-teal/15">
                {t("legalCenter.heroLabel") || "Legal Information"}
              </p>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-navy sm:text-4xl lg:text-5xl">
                {t("legal.index.heroTitle") || "Legal Center"}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                {legalCenterDescription}
              </p>
            </div>

            <Card className="border-teal/20 bg-white/90 p-5 shadow-md sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal/10 text-teal-dark ring-1 ring-teal/15">
                  <Building2 size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-dark">
                    Company & compliance
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-navy">
                    {legalProfile.company.legalName}
                  </h2>
                </div>
              </div>

              <dl className="mt-5 space-y-4 text-sm leading-6">
                <div>
                  <dt className="font-semibold text-navy">California Seller of Travel</dt>
                  <dd className="text-muted">
                    Registration No. {sellerOfTravel.registrationNumber}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-navy">Registration expires</dt>
                  <dd className="text-muted">{formatDate(sellerOfTravel.expires)}</dd>
                </div>
              </dl>

              <p className="mt-4 rounded-2xl bg-surface-muted p-3 text-sm leading-6 text-muted">
                {sellerOfTravel.publicNotice}
              </p>

              <div className="mt-5 grid gap-2 text-sm">
                {contacts.map((contact) => (
                  <a
                    key={contact.email}
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 font-semibold text-teal-dark transition hover:bg-teal/10"
                  >
                    <Mail size={16} />
                    <span>{contact.label}: {contact.email}</span>
                  </a>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section aria-labelledby="legal-documents-heading" className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-teal-dark">
                <ShieldCheck size={18} />
                Official resources
              </p>
              <h2 id="legal-documents-heading" className="mt-1 text-2xl font-bold text-navy sm:text-3xl">
                Legal documents
              </h2>
            </div>
            <p className="text-sm text-muted">
              {documents.length} policies and notices available
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {documents.map((document) => {
              const documentKey = legalIndexDocumentKeys[document.slug];
              const title = documentKey
                ? t(`legal.index.documents.${documentKey}.title`)
                : document.title;
              const summary = documentKey
                ? t(`legal.index.documents.${documentKey}.summary`)
                : document.summary;

              return (
                <Link key={document.slug} href={`/legal/${document.slug}`} className="group">
                  <Card className="flex h-full flex-col p-5 transition group-hover:-translate-y-0.5 group-hover:border-teal/40 group-hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-teal-dark">
                        <FileText size={20} />
                      </div>
                      <ArrowRight className="mt-2 text-muted transition group-hover:translate-x-1 group-hover:text-teal-dark" size={18} />
                    </div>
                    <h3 className="mt-4 font-bold text-navy">{title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-muted">{summary}</p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-teal-dark">
                      {t("legal.index.lastUpdated")}: {t("legal.index.lastUpdatedDate")}
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
