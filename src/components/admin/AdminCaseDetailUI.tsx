import type { ReactNode } from "react";

/** Presentation-only primitives shared by Support and Deletion Requests details.
 * Their permission checks, read services, forms and lifecycle actions stay in
 * the respective existing components. */
export const casePageClass = "mx-auto w-full min-w-0 max-w-[1280px] bg-white text-[#334155]";
export const caseColumnsClass = "mt-6 grid min-w-0 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] lg:gap-8 xl:gap-10";
export const caseMainClass = "min-w-0 space-y-6";
export const caseAsideClass = "min-w-0 space-y-6 lg:border-l lg:border-[#E7ECF5] lg:pl-6";

export function CaseDetailHeading({ title, status, dot }: { title: string; status: string; dot: string }) {
  return (
    <header className="min-w-0 border-b border-[#E7ECF5] pb-5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="min-w-0 break-words text-[24px] font-semibold leading-tight tracking-[-0.025em] text-[#0F172A] sm:text-[26px]">
          {title}
        </h1>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-[12px] font-medium text-[#475569]">
          <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + dot} />
          {status}
        </span>
      </div>
    </header>
  );
}

export function CaseSectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="border-b border-[#E7ECF5] pb-2.5 text-[14px] font-semibold leading-5 text-[#0F172A]">
      {children}
    </h2>
  );
}

export function CaseInfoField({ label, children, wide = false }: {
  label: string; children: ReactNode; wide?: boolean;
}) {
  return (
    <div className={"min-w-0 " + (wide ? "sm:col-span-2" : "")}>
      <dt className="text-[12px] font-medium text-[#64748B]">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-[13px] font-medium leading-5 text-[#334155]">
        {children}
      </dd>
    </div>
  );
}

export function CaseSidebarField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[90px_minmax(0,1fr)] items-start gap-x-3 py-1.5 text-[12px] leading-5">
      <dt className="text-[#64748B]">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-[#334155]">{children}</dd>
    </div>
  );
}

export function CaseMilestone({ label, value, tone = "neutral" }: {
  label: string; value: string; tone?: "neutral" | "info" | "complete";
}) {
  const dot = tone === "info" ? "bg-[#004BB8]" : tone === "complete" ? "bg-emerald-500" : "bg-[#94A3B8]";
  return (
    <div className="min-w-0 border-l-2 border-[#E7ECF5] py-1 pl-3">
      <dt className="inline-flex items-center gap-2 text-[12px] font-medium text-[#64748B]">
        <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + dot} />
        {label}
      </dt>
      <dd className="mt-1 break-words text-[13px] font-semibold leading-5 tabular-nums text-[#334155]">{value}</dd>
    </div>
  );
}
