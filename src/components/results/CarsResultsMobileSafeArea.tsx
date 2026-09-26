export function CarsResultsMobileSafeArea() {
  return (
    <>
      <style>{`
        @media (max-width: 639px) {
          [data-cars-results-experience] > header[class*="--cars-results-safe-area-top"] {
            background-color: var(--cars-results-safe-area-surface, #ffffff);
          }

          html:has(
            [data-cars-results-experience]
              > header[class*="--cars-results-safe-area-top"].translate-y-0
          ) {
            --cars-results-safe-area-surface: #F2F4F8;
          }
        }
      `}</style>
      <div
        data-cars-results-mobile-safe-area
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[var(--cars-results-safe-area-top)] sm:hidden"
        style={{
          backgroundColor: "var(--cars-results-safe-area-surface, #ffffff)",
        }}
      />
    </>
  );
}
