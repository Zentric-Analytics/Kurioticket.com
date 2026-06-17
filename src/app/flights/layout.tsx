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
