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

        main.bg-slate-50 > section.border-y .page-shell {
          padding-top: 2.15rem;
          padding-bottom: 2.15rem;
        }

        main.bg-slate-50 > section.border-y article {
          gap: 1rem;
        }

        main.bg-slate-50 > section.border-y article > div:first-child {
          height: 3.75rem;
          width: 3.75rem;
          border-radius: 1.15rem;
        }

        main.bg-slate-50 > section.border-y article svg {
          height: 3.1rem;
          width: 3.1rem;
        }

        main.bg-slate-50 > section.border-y article h2 {
          font-size: 1.045rem;
          line-height: 1.55rem;
        }

        main.bg-slate-50 > section.border-y article p {
          font-size: 0.94rem;
          line-height: 1.62rem;
        }

        [data-standalone-flight-desktop-popover] p.mb-1,
        [data-flight-mobile-picker-shell] p.mb-1 {
          display: none;
        }

        [data-standalone-flight-desktop-popover] div:has(> p.mb-1) > h2 {
          margin-bottom: 0.8rem;
          font-size: 1.08rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: rgb(15 23 42);
        }

        [data-standalone-flight-desktop-popover] div:has(> p.mb-1) span.block.text-base,
        [data-flight-mobile-picker-shell] div:has(> p.mb-1) span.block.text-base {
          text-transform: capitalize;
          font-weight: 650;
          letter-spacing: -0.01em;
        }

        [data-standalone-flight-desktop-popover] span.min-w-8,
        [data-flight-mobile-picker-shell] span.min-w-8 {
          font-weight: 700;
        }

        [data-standalone-flight-desktop-popover] p.uppercase {
          font-weight: 650;
          letter-spacing: 0.12em;
        }

        [data-standalone-flight-desktop-popover] .grid.grid-cols-3 button,
        [data-flight-mobile-picker-shell] .grid.grid-cols-3 button {
          font-weight: 600;
        }

        main.bg-slate-50 > section.page-shell.space-y-12 > div > div.mb-5 > h2,
        main.bg-slate-50 > section.page-shell.space-y-12 > section > div > h2 {
          font-weight: 700;
          letter-spacing: -0.025em;
          color: rgb(2 6 23);
        }

        main.bg-slate-50 > section.page-shell.space-y-12 > div > div.mb-5 > p,
        main.bg-slate-50 > section.page-shell.space-y-12 > section > div > p {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          line-height: 1.5rem;
          color: rgb(71 85 105);
        }

        main.bg-slate-50 > section.border-y + section.page-shell {
          margin-top: 3.5rem;
        }

        @media (min-width: 640px) {
          main.bg-slate-50 > section.border-y .page-shell {
            padding-top: 2.35rem;
            padding-bottom: 2.35rem;
          }

          main.bg-slate-50 > section.border-y article {
            padding-top: 0.55rem;
            padding-bottom: 0.55rem;
          }

          main.bg-slate-50 > section.page-shell.space-y-12 > div > div.mb-5 > p,
          main.bg-slate-50 > section.page-shell.space-y-12 > section > div > p {
            font-size: 1rem;
          }

          main.bg-slate-50 > section.border-y + section.page-shell {
            margin-top: 3.75rem;
          }
        }

        @media (min-width: 1024px) {
          main.bg-slate-50 > section.border-y .page-shell {
            padding-top: 2.55rem;
            padding-bottom: 2.55rem;
          }

          main.bg-slate-50 > section.border-y + section.page-shell {
            margin-top: 4rem;
          }
        }
      `}</style>
    </>
  );
}
