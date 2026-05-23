"use client";

import { useSession } from "next-auth/react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { legalDocuments } from "@/data/legalDocuments";

export function Footer() {
  const { t } = useLocale();

  const { data: session } =
    useSession();

  const isSignedIn = Boolean(
    session?.user
  );

  return (
    <footer className="border-t border-indigo-800/40 bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white">
      <div className="page-shell grid gap-8 py-10 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="text-lg font-bold">
            Curioticket
          </div>

          <p className="mt-3 max-w-md text-sm leading-6 text-indigo-100/90">
            {t.footerAbout}
          </p>

          <p className="mt-4 text-xs leading-5 text-indigo-200/70">
            {t.footerMeta}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-100/85">
            {t.platform}
          </h2>

          <div className="mt-3 grid gap-2 text-sm text-indigo-100/90">
            <a href="/flights/results">
              {t.flights}
            </a>

            <a href="/hotels/results">
              {t.hotels}
            </a>

            <a href="/deals">
              {t.deals}
            </a>

            <a href="/destinations">
              {t.destinations}
            </a>

            <a href="/explore">
              {t.explore}
            </a>

            {isSignedIn ? (
              <a href="/pricing">
                {t.premium}
              </a>
            ) : null}

            <a href="/support">
              {t.support}
            </a>

            {isSignedIn ? (
              <a href="/dashboard">
                {t.dashboard}
              </a>
            ) : null}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-100/85">
            {t.legal}
          </h2>

          <div className="mt-3 grid gap-2 text-sm text-indigo-100/90">
            <a href="/legal">
              {t.legalCenter}
            </a>

            {legalDocuments
              .slice(0, 5)
              .map((document) => (
                <a
                  key={document.slug}
                  href={`/legal/${document.slug}`}
                >
                  {document.title}
                </a>
              ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
