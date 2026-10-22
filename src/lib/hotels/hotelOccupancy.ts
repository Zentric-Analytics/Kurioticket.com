/** Legacy URLs contain only a total guest count. New searches preserve the mix. */
export function hotelOccupancy(search: { guests: number; adults?: number; children?: number }) {
  const children = search.children ?? (search.adults === undefined ? 0 : search.guests - search.adults);
  return { adults: search.adults ?? search.guests - children, children };
}
