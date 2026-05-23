import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export default function DestinationsPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell py-10">
        <h1 className="text-3xl font-black text-slate-950">Destinations</h1>
        <p className="mt-2 text-slate-600">Explore curated destination ideas and travel inspiration.</p>
      </main>
      <Footer />
    </>
  );
}
