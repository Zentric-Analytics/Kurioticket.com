type RouteLike = {
  name: string;
};

type NavigationStateLike = {
  index?: number;
  routes: readonly RouteLike[];
};

export function carResultsDismissCount(
  state: NavigationStateLike | undefined,
): number | null {
  if (!state?.routes.length) return null;

  const currentIndex =
    typeof state.index === "number" ? state.index : state.routes.length - 1;
  if (currentIndex <= 0 || currentIndex >= state.routes.length) return null;

  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (state.routes[index]?.name === "car-results") {
      return currentIndex - index;
    }
  }

  return null;
}
