import { BrandedLoading } from "@/components/layout/BrandedLoading";

export default function GlobalLoading() {
  return (
    <main>
      <BrandedLoading
        variant="fullscreen"
        title="Loading Kurioticket..."
        description="Getting things ready..."
      />
    </main>
  );
}
