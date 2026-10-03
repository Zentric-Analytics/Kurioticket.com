import type { ReactNode } from "react";

export default function CarDetailsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <style>{`
        @media (min-width: 1024px) {
          .page-shell {
            position: relative;
          }

          main:has([data-car-details-experience]) {
            background: #EEF2F7 !important;
          }

          [data-car-details-content-grid] {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 0 !important;
          }

          [data-car-details-primary-column] {
            display: contents !important;
          }

          [data-car-details-primary-column] > * {
            order: 3;
          }

          [data-car-details-primary-column] > [data-car-details-hero] {
            order: 1;
          }
          [data-car-details-section-nav] {
            background: transparent !important;
          }

          [data-car-details-scroll-section] {
            scroll-margin-top: 5.5rem;
          }

          [data-car-details-section-panels] {
            margin-top: 0 !important;
          }

          #car-pickup-panel {
            padding-top: 0.75rem;
          }

          [data-car-details-desktop-footer] {
            position: relative;
            z-index: 40;
          }
        }
      `}</style>
      {children}
    </>
  );
}
