import type { ReactNode } from "react";
import { reportHead, reportPanel, reportRow } from "../bots/report-ui";

export const liveBotChoice = "inline-flex min-h-10 items-center rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-[#F2F7FF] focus-ring aria-[current]:border-[#004BB8] aria-[current]:bg-[#F2F7FF] aria-[current]:text-[#004BB8]";
export const liveBotNumber = new Intl.NumberFormat("en-US");

export function LiveBotLoading() {
  return <p role="status" className={reportPanel + " p-4 text-sm text-slate-700"}>Loading bot activity…</p>;
}

export function LiveBotTable({ label, columns, children, footer }: {
  label: string;
  columns: string[];
  children: ReactNode;
  footer?: ReactNode;
}) {
  return <div className={reportPanel}>
    <table role="table" aria-label={label} className="block w-full text-left text-[13px] text-slate-700 md:table">
      <thead role="rowgroup" className={reportHead + " sr-only md:not-sr-only"}>
        <tr role="row">{columns.map(column => <th role="columnheader" scope="col" key={column}>{column}</th>)}</tr>
      </thead>
      <tbody role="rowgroup" className="block md:table-row-group">{children}</tbody>
    </table>
    {footer}
  </div>;
}

export function LiveBotRow({ columns, cells, anchor }: { columns: string[]; cells: ReactNode[]; anchor: string }) {
  return <tr role="row" data-users-refresh-anchor={anchor}
    className={reportRow + " block space-y-2 p-3 align-top max-md:[&>td]:p-0 md:table-row md:space-y-0 md:p-0"}>
    {columns.map((column, index) => <td key={column} role="cell"
      className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)] gap-2 md:table-cell">
      <span aria-hidden="true" className="text-xs font-medium text-slate-600 md:hidden">{column}</span>
      <div className="min-w-0 wrap-anywhere">{cells[index]}</div>
    </td>)}
  </tr>;
}

export function LiveBotStatus({ active }: { active: boolean }) {
  return <span className={"inline-block rounded-full px-2 py-0.5 text-xs font-medium "
    + (active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700")}>
    {active ? "Active" : "Inactive"}
  </span>;
}

export function liveBotVerification(value: string) {
  return value === "VERIFIED" ? "Verified" : "Unverified";
}
