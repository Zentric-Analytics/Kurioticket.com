"use client";

import { Suspense } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { RedirectClient } from "@/components/results/RedirectClient";
import { Card } from "@/components/ui/Card";

function RedirectFallback() {
  const { t } = useLocale();

  return (
    <main className="page-shell flex-1 py-10">
      <Card className="p-5 text-muted">{t["redirect.loading"]}</Card>
    </main>
  );
}

export default function RedirectPage() {
  return (
    <>
      <AppHeader />
      <Suspense fallback={<RedirectFallback />}>
        <RedirectClient />
      </Suspense>
      <Footer />
    </>
  );
}
