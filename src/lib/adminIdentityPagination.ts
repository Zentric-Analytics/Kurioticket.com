export function getAdminIdentityPagination(requested: string | undefined, users: number, guests: number, pageSize = 15) {
  const count = users + guests;
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const requestedPage = requested && /^\d+$/.test(requested) ? Number(requested) : 1;
  const page = Math.min(pageCount, Math.max(1, requestedPage));
  const offset = (page - 1) * pageSize;
  const userOffset = Math.min(users, offset);
  const userTake = Math.min(pageSize, Math.max(0, users - userOffset));
  return {
    count, page, pageCount, userOffset, userTake,
    guestOffset: Math.max(0, offset - users),
    guestsTake: pageSize - userTake,
  };
}
