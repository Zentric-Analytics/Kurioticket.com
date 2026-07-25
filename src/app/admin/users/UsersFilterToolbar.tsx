"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  AdminButton,
  AdminInput,
  AdminSelect,
} from "@/components/admin/AdminPageShell";
import type { UserRoleFilter, UserStatusFilter } from "./page-data";

export const USER_SEARCH_DEBOUNCE_MS = 400;

type UsersFilterToolbarProps = {
  q: string;
  role: UserRoleFilter;
  status: UserStatusFilter;
};

export function buildUsersFilterHref({ q, role, status }: UsersFilterToolbarProps) {
  const params = new URLSearchParams();
  const search = q.trim();
  if (search) params.set("q", search);
  if (role !== "ALL") params.set("role", role);
  if (status !== "ALL") params.set("status", status);
  const query = params.toString();
  return `/admin/users${query ? `?${query}` : ""}`;
}

export function UsersFilterToolbar({ q, role, status }: UsersFilterToolbarProps) {
  const router = useRouter();
  const [search, setSearch] = useState(q);
  const [selectedRole, setSelectedRole] = useState(role);
  const [selectedStatus, setSelectedStatus] = useState(status);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roleRef = useRef(selectedRole);
  const statusRef = useRef(selectedStatus);

  roleRef.current = selectedRole;
  statusRef.current = selectedStatus;

  useEffect(() => setSearch(q), [q]);
  useEffect(() => setSelectedRole(role), [role]);
  useEffect(() => setSelectedStatus(status), [status]);

  const cancelDebounce = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = null;
  }, []);

  const applyFilters = useCallback((nextFilters: UsersFilterToolbarProps) => {
    const href = buildUsersFilterHref(nextFilters);
    const currentHref = `${window.location.pathname}${window.location.search}`;
    if (href !== currentHref) router.replace(href, { scroll: false });
  }, [router]);

  useEffect(() => {
    cancelDebounce();
    debounceTimer.current = setTimeout(() => {
      applyFilters({ q: search, role: roleRef.current, status: statusRef.current });
    }, USER_SEARCH_DEBOUNCE_MS);
    return cancelDebounce;
  }, [applyFilters, cancelDebounce, search]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    cancelDebounce();
    applyFilters({ q: search, role: selectedRole, status: selectedStatus });
  }

  return (
    <form
      action="/admin/users"
      className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(9rem,1fr)_minmax(9rem,1fr)_auto] md:items-center"
      onSubmit={submitSearch}
    >
      <label className="relative min-w-0">
        <span className="sr-only">Search</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <AdminInput name="q" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users..." aria-label="Search users" className="bg-white pl-9" />
      </label>
      <label>
        <span className="sr-only">Role</span>
        <AdminSelect
          name="role"
          value={selectedRole}
          aria-label="Role"
          className="bg-white"
          onChange={(event) => {
            cancelDebounce();
            const nextRole = event.target.value as UserRoleFilter;
            setSelectedRole(nextRole);
            applyFilters({ q: search, role: nextRole, status: selectedStatus });
          }}
        >
          <option value="ALL">All roles</option><option value="USER">User</option><option value="SUPPORT">Support</option><option value="ADMIN">Admin</option>
        </AdminSelect>
      </label>
      <label>
        <span className="sr-only">Status</span>
        <AdminSelect
          name="status"
          value={selectedStatus}
          aria-label="Status"
          className="bg-white"
          onChange={(event) => {
            cancelDebounce();
            const nextStatus = event.target.value as UserStatusFilter;
            setSelectedStatus(nextStatus);
            applyFilters({ q: search, role: selectedRole, status: nextStatus });
          }}
        >
          <option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="DELETED">Deleted</option>
        </AdminSelect>
      </label>
      <AdminButton
        type="button"
        variant="secondary"
        className="w-full md:w-auto"
        onClick={() => {
          cancelDebounce();
          setSearch("");
          setSelectedRole("ALL");
          setSelectedStatus("ALL");
          applyFilters({ q: "", role: "ALL", status: "ALL" });
        }}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Clear filters
      </AdminButton>
    </form>
  );
}
