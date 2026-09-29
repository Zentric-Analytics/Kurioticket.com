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
