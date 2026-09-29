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

          [data-car-details-experience] > div.grid {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 1.25rem !important;
          }

          [data-car-details-experience] > div.grid > div:first-child {
            display: contents !important;
          }

          [data-car-details-experience] > div.grid > div:first-child > * {
            order: 3;
          }

          [data-car-details-experience] > div.grid > div:first-child > section:first-child {
            order: 1;
          }

          [data-car-details-experience] > div.grid > aside {
            order: 2;
            position: static !important;
            width: 100%;
            max-width: 760px;
            margin: 0 auto;
          }

          [data-car-details-experience] section:has(> div > [data-car-details-image-stage]) {
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: #F5F7FB !important;
            padding: 0 !important;
            box-shadow: none !important;
          }

          [data-car-details-image-stage] {
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: #F5F7FB !important;
            padding: 0 !important;
            box-shadow: none !important;
          }

          [data-car-details-image-stage] > div {
            border-radius: 0 !important;
            background: #F5F7FB !important;
          }

          [data-car-details-experience] [data-car-details-desktop-identity-row] {
            display: block;
            width: 100%;
            max-width: 760px;
            margin-left: auto;
            margin-right: auto;
            text-align: center;
          }

          [data-car-details-experience] [data-car-details-desktop-identity-row] > div:first-child {
            width: 100%;
            text-align: center;
          }

          [data-car-details-experience] [data-car-details-specifications] {
            max-width: 760px;
            margin-left: auto !important;
            margin-right: auto !important;
            justify-content: center !important;
          }

          [data-car-details-section-nav] {
            background: #F5F7FB !important;
          }

          [data-car-details-section-panels] {
            margin-top: 0 !important;
          }

          [data-car-price-comparison],
          [data-car-location-section] {
            background: #F5F7FB !important;
          }

          [data-car-price-comparison] [data-mobile-car-deal-list] {
            display: block !important;
          }

          [data-car-price-comparison] [data-mobile-car-deal-list] + div {
            display: none !important;
          }

          #car-pickup-panel > section {
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: #F5F7FB !important;
            padding: 0.75rem 0 1.75rem !important;
            box-shadow: none !important;
          }

        }
      `}</style>
      {children}
    </>
  );
}
