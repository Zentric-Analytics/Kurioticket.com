import { BrandedLoading } from "@/components/layout/BrandedLoading";

export default function PageLoading() {
  return (
    <main className="min-h-[100svh] bg-[radial-gradient(circle_at_top_left,rgba(92,182,178,0.20),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,75,184,0.16),transparent_36%),linear-gradient(180deg,#F2F7FA_0%,#FFFFFF_58%,#FFFFFF_100%)]">
      <BrandedLoading
        variant="fullscreen"
        visual="logoPulse"
        showProgress={false}
        className="min-h-[100svh] bg-transparent px-5"
        contentClassName="max-w-md text-center"
        searchType="hotel"
      />
    </main>
  );
}
