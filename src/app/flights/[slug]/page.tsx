import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SearchTabs } from "@/components/search/SearchTabs";
import { Card } from "@/components/ui/Card";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: cheapRouteTitle(slug) };
}

export default async function FlightRouteLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <>
      <AppHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-white">
          <div className="page-shell py-8">
            <p className="text-sm font-semibold text-teal-dark">Future route intelligence page</p>
            <h1 className="mt-2 text-3xl font-bold text-navy">{cheapRouteTitle(slug)}</h1>
            <p className="mt-3 max-w-2xl text-muted">
              This route landing foundation is ready for fare history, seasonality, airport guidance, and cheap route content.
            </p>
          </div>
        </section>
        <div className="page-shell grid gap-6 py-8 lg:grid-cols-[1fr_360px]">
          <SearchTabs />
          <Card className="p-5">
            <h2 className="font-bold text-navy">Content roadmap</h2>
            <ul className="mt-3 grid gap-2 text-sm text-muted">
              <li>Best time to book</li>
              <li>Airport and layover notes</li>
              <li>Budget ranges and alerts</li>
              <li>Hotel coordination insights</li>
            </ul>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}

function cheapRouteTitle(slug: string) {
  return `Cheap flights: ${slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}`;
}
