export const ADMIN_USERS_DIRECTORY_PAGE_SIZE = 20;
// This is only JavaScript's exact-integer boundary, not a retained-record cap.
export const ADMIN_USERS_DIRECTORY_MAX_PAGE = Math.floor(Number.MAX_SAFE_INTEGER / ADMIN_USERS_DIRECTORY_PAGE_SIZE) + 1;

export function isAdminUsersDirectoryPageValue(value: unknown): value is string {
  if (typeof value !== "string" || !/^[1-9]\d{0,15}$/.test(value)) return false;
  const page = Number(value);
  return Number.isSafeInteger(page) && page <= ADMIN_USERS_DIRECTORY_MAX_PAGE;
}

/** Invalid page syntax returns the first page without changing any filters. */
export function parseAdminUsersDirectoryPage(value: unknown): number {
  if (typeof value !== "string" || !/^\d{1,16}$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? Math.max(1, Math.min(page, ADMIN_USERS_DIRECTORY_MAX_PAGE)) : 1;
}

export function adminUsersDirectoryPageBounds(requested: number, total: number) {
  if (!Number.isSafeInteger(total) || total < 0) throw new Error("Invalid Users directory total");
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_USERS_DIRECTORY_PAGE_SIZE));
  const page = Math.min(parseAdminUsersDirectoryPage(String(requested)), totalPages);
  return { page, totalPages, total, offset: (page - 1) * ADMIN_USERS_DIRECTORY_PAGE_SIZE };
}

/** Pagination preserves the complete applied directory scope and a fixed path. */
export function adminUsersDirectoryPageHref(applied: URLSearchParams, page: number) {
  const params = new URLSearchParams(applied);
  params.delete("page");
  if (page > 1) params.set("page", String(page));
  return "/admin/users" + (params.size ? "?" + params : "");
}
