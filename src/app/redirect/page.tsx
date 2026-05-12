import { Suspense } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { RedirectClient } from "@/components/results/RedirectClient";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Secure Redirect",
};

export default function RedirectPage() {
  return (
    <>
      <AppHeader />
      <Suspense fallback={<main className="page-shell flex-1 py-10"><Card className="p-5 text-muted">Preparing redirect...</Card></main>}>
        <RedirectClient />
      </Suspense>
      <Footer />
    </>
  );
}
