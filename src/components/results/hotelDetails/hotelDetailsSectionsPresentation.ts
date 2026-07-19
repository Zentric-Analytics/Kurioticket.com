export function normalizeHotelDetailsSectionValues(
  values: ReadonlyArray<string | null | undefined>,
) {
  const seen = new Set<string>();

  return values.reduce<string[]>((items, value) => {
    const trimmed = value?.trim() || "";
    const normalized = trimmed.toLocaleLowerCase();

    if (!trimmed || seen.has(normalized)) return items;
    seen.add(normalized);
    items.push(trimmed);
    return items;
  }, []);
}

export function getRoomAndStayValues(
  roomType?: string | null,
  mealPlan?: string | null,
) {
  const roomValues = normalizeHotelDetailsSectionValues([roomType]);
  const normalizedRoom = roomValues[0]?.toLocaleLowerCase() || "";
  const mealValues = normalizeHotelDetailsSectionValues([mealPlan]);
  const meal = mealValues[0];

  if (
    meal &&
    normalizedRoom.includes(meal.toLocaleLowerCase())
  ) {
    return roomValues;
  }

  return normalizeHotelDetailsSectionValues([...roomValues, meal]);
}
