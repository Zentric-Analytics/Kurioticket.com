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
            background-color: #F5F7FB !important;
          }

          main:has([data-car-details-experience]) > section {
            background-color: #F5F7FB !important;
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

          [data-car-details-experience] #car-pickup-panel > section {
            background-color: transparent !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }
      `}</style>
      {children}
    </>
  );
}
