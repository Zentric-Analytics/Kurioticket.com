import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export default function ExplorePage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell py-10">
        <h1 className="text-3xl font-black text-slate-950">Explore</h1>
        <p className="mt-2 text-slate-600">Discover trending routes, hotel hotspots, and planning tools.</p>
      </main>
      <Footer />
    </>
  );
}
