import type { ReactNode } from "react";

export default function FlightsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style>{`
        main.bg-slate-50 > section.border-y {
          border-top-color: rgb(203 213 225 / 0.9);
          border-bottom-color: rgb(148 163 184 / 0.78);
          box-shadow: inset 0 -1px 0 rgb(100 116 139 / 0.16);
        }

        main.bg-slate-50 > section.border-y + section.page-shell {
          margin-top: 8.5rem;
        }

        @media (min-width: 640px) {
          main.bg-slate-50 > section.border-y + section.page-shell {
            margin-top: 10rem;
          }
        }

        @media (min-width: 1024px) {
          main.bg-slate-50 > section.border-y + section.page-shell {
            margin-top: 11rem;
          }
        }
      `}</style>
    </>
  );
}
