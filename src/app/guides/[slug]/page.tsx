import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: titleize(slug) };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28">
        <article className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">Travel intelligence article</p>
          <h1 className="mt-2 text-3xl font-bold text-navy">{titleize(slug)}</h1>
          <Card className="mt-6 p-6">
            <p className="leading-7 text-muted">
              Use this guide to organize trip planning details, compare travel considerations, and continue into Kurioticket flight and hotel search tools.
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
