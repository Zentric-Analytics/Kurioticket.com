import { SearchTabs } from "@/components/search/SearchTabs";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f6f3ff] p-6">
      <div className="mx-auto max-w-7xl">
        <SearchTabs />
      </div>
    </main>
  );
}