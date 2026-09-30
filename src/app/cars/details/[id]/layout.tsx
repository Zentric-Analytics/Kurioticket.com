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

          [data-car-details-content-grid] {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 1.5rem !important;
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

          [data-car-details-bottom-booking-bar] {
            width: min(700px, calc(100% - 48px));
            margin: 3rem auto 0;
            padding: 0.9rem 1.25rem;
            border: 1px solid rgba(216, 225, 236, 0.96);
            border-radius: 16px;
            background: #FFFFFF;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
          }

          [data-car-details-bottom-booking-bar] > div {
            display: grid;
            grid-template-columns: minmax(180px, 1fr) minmax(220px, 240px);
            grid-template-rows: auto auto;
            column-gap: 1.5rem;
            align-items: center;
            width: 100%;
            margin: 0;
            padding: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
            box-shadow: none;
          }

          [data-car-details-bottom-booking-bar] > div > p:nth-child(1) {
            grid-column: 1;
            grid-row: 2;
            margin: 0;
            font-size: 0.75rem;
            line-height: 1rem;
            color: #56658E;
          }

          [data-car-details-bottom-booking-bar] > div > p:nth-child(2) {
            grid-column: 1;
            grid-row: 1;
            margin: 0;
            font-size: 1.5rem;
            line-height: 1.75rem;
            color: #071A48;
          }

          [data-car-details-bottom-booking-bar] > div > a,
          [data-car-details-bottom-booking-bar] > div > button,
          [data-car-details-bottom-booking-bar] > div > div {
            grid-column: 2;
            grid-row: 1 / span 2;
            width: 100%;
            margin-top: 0 !important;
            align-self: center;
          }

          [data-car-details-desktop-controls] {
            min-height: 4rem;
          }

          [data-car-details-section-nav] {
            background: #F5F7FB !important;
          }

          [data-car-details-scroll-section] {
            scroll-margin-top: 5.5rem;
          }

          [data-car-details-section-panels] {
            margin-top: 0 !important;
          }

          [data-car-price-comparison],
          [data-car-location-section] {
            background: #F5F7FB !important;
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
