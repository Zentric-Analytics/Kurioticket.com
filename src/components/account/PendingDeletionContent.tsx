"use client";

import { useMemo } from "react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Footer } from "@/components/layout/Footer";
import { AppHeader } from "@/components/layout/AppHeader";
import { PendingDeletionActions } from "@/components/account/PendingDeletionActions";

function formatPendingDeletionDeadline(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PendingDeletionContent({ deadline }: { deadline: string }) {
  const { locale, t } = useLocale();
  const formattedDeadline = useMemo(
    () => formatPendingDeletionDeadline(deadline, locale),
    [deadline, locale]
  );

  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-[#f3f7fc] px-4 py-12">
        <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal">{t["account.pendingDeletion.eyebrow"]}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{t["account.pendingDeletion.title"]}</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            {t["account.pendingDeletion.scheduledPrefix"]} <strong className="text-slate-950">{formattedDeadline}</strong>.
          </p>
          <p className="mt-3 text-base leading-7 text-slate-600">{t["account.pendingDeletion.reactivateNotice"]}</p>
          <PendingDeletionActions deadline={deadline} />
        </section>
      </main>
      <Footer />
    </>
  );
}
