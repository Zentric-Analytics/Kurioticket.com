import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";

const guides = [
  "best-time-to-book-flights",
  "how-to-avoid-risky-layovers",
  "how-to-compare-baggage-inclusive-fares",
];

export const metadata = {
  title: "Travel Intelligence Guides",
};

export default function GuidesPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 py-8">
        <h1 className="text-3xl font-bold text-navy">Travel Intelligence Guides</h1>
        <p className="mt-2 max-w-2xl text-muted">Content foundation for route, airport, destination, cheap route, hotel, and travel intelligence articles.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {guides.map((guide) => (
            <Link key={guide} href={`/guides/${guide}`}>
              <Card className="h-full p-5 transition hover:border-teal">
                <h2 className="font-bold text-navy">{titleize(guide)}</h2>
                <p className="mt-2 text-sm text-muted">Editorial page shell ready for SEO content and internal travel data.</p>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}

function titleize(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
