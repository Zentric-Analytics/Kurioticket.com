export function CarsResultsMobileSafeArea() {
  return (
    <div
      data-cars-results-mobile-safe-area
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[var(--cars-results-safe-area-top)] sm:hidden"
      style={{
        backgroundColor: "var(--cars-results-safe-area-surface, #ffffff)",
      }}
    />
  );
}
