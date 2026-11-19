export type HomepageTripType = "round-trip" | "one-way" | "multi-city";

const homepageTripTypes: readonly HomepageTripType[] = [
  "round-trip",
  "one-way",
  "multi-city",
];

export function nextHomepageTripType(
  current: HomepageTripType,
  direction: -1 | 1,
): HomepageTripType {
  const currentIndex = homepageTripTypes.indexOf(current);
  return homepageTripTypes[
    (currentIndex + direction + homepageTripTypes.length) % homepageTripTypes.length
  ];
}

export function committedHomepageTripType(
  pointerDownTripType: HomepageTripType | null,
  clickedTripType: HomepageTripType,
): HomepageTripType | null {
  return pointerDownTripType === null || pointerDownTripType === clickedTripType
    ? clickedTripType
    : null;
}

export function isHomepageTripType(value: string | undefined): value is HomepageTripType {
  return homepageTripTypes.includes(value as HomepageTripType);
}
