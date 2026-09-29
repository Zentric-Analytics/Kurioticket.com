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
            background: #F5F7FB !important;
          }

          main:has([data-car-details-experience]) > section {
            background: transparent !important;
            border-bottom-color: transparent !important;
          }

          [data-car-details-experience] section:has(> div > [data-car-details-image-stage]) {
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            padding: 0 !important;
            box-shadow: none !important;
          }

          [data-car-details-image-stage] {
            overflow: hidden;
            border: 1px solid rgb(226 232 240);
            border-radius: 13px;
            background: #ffffff;
            padding: 1.5rem;
          }

          [data-car-details-section-nav] {
            background: #F5F7FB !important;
          }

          [data-car-price-comparison],
          [data-car-location-section] {
            background: transparent !important;
          }

          #car-pickup-panel > section {
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            padding: 0.75rem 0 1.75rem !important;
            box-shadow: none !important;
          }

          [data-car-details-experience] [data-car-details-desktop-actions] {
            position: absolute;
            top: 1.5rem;
            right: 0;
            z-index: 20;
            margin: 0;
          }

          [data-car-details-experience] [data-car-details-desktop-identity-row] {
            display: block;
          }
        }
      `}</style>
      {children}
    </>
  );
}
