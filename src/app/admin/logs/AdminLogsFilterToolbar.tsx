"use client";

import { type FormEvent, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminInput, AdminLinkButton, AdminSelect } from "@/components/admin/AdminPageShell";
import { buildAdminLogsHref, type parseAdminLogsSearchParams } from "./page-data";

export function AdminLogsFilterToolbar({ filters, admins, actions }: { filters: ReturnType<typeof parseAdminLogsSearchParams>; admins: string[]; actions: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const [admin, setAdmin] = useState(filters.admin);
  const [action, setAction] = useState(filters.action);
  const apply = (next: { q: string; admin: string; action: string }) => router.replace(buildAdminLogsHref(1, next), { scroll: false });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); apply({ q, admin, action }); }

  return <form action="/admin/logs" onSubmit={submit} role="search" aria-label="Filter admin logs" className="grid gap-3 md:grid-cols-[minmax(20rem,2fr)_minmax(11rem,1fr)_minmax(11rem,1fr)_auto] md:items-center">
    <label className="relative min-w-0"><span className="sr-only">Search logs</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><AdminInput name="q" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search logs..." className="bg-white pl-9" /></label>
    <label><span className="sr-only">Admin</span><AdminSelect name="admin" value={admin} onChange={(event) => { setAdmin(event.target.value); apply({ q, admin: event.target.value, action }); }} className="bg-white"><option value="ALL">Admin</option>{admins.map((email) => <option key={email} value={email}>{email}</option>)}</AdminSelect></label>
    <label><span className="sr-only">Action</span><AdminSelect name="action" value={action} onChange={(event) => { setAction(event.target.value); apply({ q, admin, action: event.target.value }); }} className="bg-white"><option value="ALL">Action</option>{actions.map((value) => <option key={value} value={value}>{value}</option>)}</AdminSelect></label>
    <AdminLinkButton href="/admin/logs" className="w-full md:w-auto"><RotateCcw className="h-4 w-4" aria-hidden="true" />Clear filters</AdminLinkButton>
  </form>;
}
