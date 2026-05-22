"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { legalDocuments } from "@/data/legalDocuments";
import {
  LANGUAGE_CHANGE_EVENT,
  getLanguageFromStorage,
  getUiTranslations,
  type LanguageCode,
} from "@/lib/language";

export function Footer() {
  const [language, setLanguage] = useState<LanguageCode>(() =>
    getLanguageFromStorage()
  );

  useEffect(() => {
    const sync = () => {
      setLanguage(getLanguageFromStorage());
    };

    window.addEventListener(
      LANGUAGE_CHANGE_EVENT,
      sync as EventListener
    );

    return () => {
      window.removeEventListener(
        LANGUAGE_CHANGE_EVENT,
        sync as EventListener
      );
    };
  }, []);

  const t = useMemo(
    () => getUiTranslations(language),
    [language]
  );

  return (
    <footer className="border-t border-border bg-navy text-white">
      <div className="page-shell grid gap-8 py-10 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="text-lg font-bold">
            Curioticket
          </div>

          <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
            {t.footerAbout}
          </p>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            {t.footerMeta}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            {t.platform}
          </h2>

          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            <Link href="/flights/results">
              {t.flights}
            </Link>

            <Link href="/hotels/results">
              {t.hotels}
            </Link>

            <Link href="/pricing">
              {t.premium}
            </Link>

            <Link href="/support">
              {t.support}
            </Link>

            <Link href="/dashboard">
              {t.dashboard}
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            {t.legal}
          </h2>

          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            <Link href="/legal">
              {t.legalCenter}
            </Link>

            {legalDocuments
              .slice(0, 5)
              .map((document) => (
                <Link
                  key={document.slug}
                  href={`/legal/${document.slug}`}
                >
                  {document.title}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </footer>
  );
}