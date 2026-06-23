import { cookies } from "next/headers";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: titleize(slug) };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28">
        <article className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">{t["guides.articleEyebrow"]}</p>
          <h1 className="mt-2 text-3xl font-bold text-navy">{titleize(slug)}</h1>
          <Card className="mt-6 p-6">
            <p className="leading-7 text-muted">
              {t["guides.articleBody"]}
            </p>
          </Card>
        </article>
      </main>
      <Footer />
    </>
  );
}

function titleize(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
