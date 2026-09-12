type RouteLike = {
  name: string;
  params?: Record<string, unknown>;
  [key: string]: unknown;
};

type NavigationStateLike = {
  index?: number;
  routes: readonly RouteLike[];
};

export type HotelStayNavigationReset = {
  index: number;
  routes: RouteLike[];
};

export function hotelResultsDismissCount(
  state: NavigationStateLike | undefined,
): number | null {
  if (!state?.routes.length) return null;

  const currentIndex =
    typeof state.index === "number" ? state.index : state.routes.length - 1;
  if (currentIndex <= 0 || currentIndex >= state.routes.length) return null;

  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (state.routes[index]?.name === "hotel-results") {
      return currentIndex - index;
    }
  }

  return null;
}

export function rebuildHotelStayNavigationState(
  state: NavigationStateLike | undefined,
  resultsParams: Record<string, unknown>,
  detailParams?: Record<string, unknown>,
): HotelStayNavigationReset | null {
  if (!state?.routes.length) return null;

  const currentIndex =
    typeof state.index === "number" ? state.index : state.routes.length - 1;
  if (currentIndex <= 0 || currentIndex >= state.routes.length) return null;

  let resultsIndex = -1;
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (state.routes[index]?.name === "hotel-results") {
      resultsIndex = index;
      break;
    }
  }
  if (resultsIndex < 0) return null;

  const resultsRoute = state.routes[resultsIndex]!;
  const currentRoute = state.routes[currentIndex]!;
  const routes: RouteLike[] = [
    ...state.routes.slice(0, resultsIndex),
    {
      ...resultsRoute,
      params: {
        ...(resultsRoute.params ?? {}),
        ...resultsParams,
      },
    },
  ];

  if (detailParams !== undefined) {
    routes.push({
      ...currentRoute,
      params: {
        ...(currentRoute.params ?? {}),
        ...detailParams,
      },
    });
  }

  return {
    index: routes.length - 1,
    routes,
  };
}
