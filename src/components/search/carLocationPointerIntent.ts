export const CAR_LOCATION_TAP_SLOP_PX = 8;

export type CarLocationPointerSession = {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

export function beginCarLocationPointerIntent(
  pointerId: number,
  clientX: number,
  clientY: number,
): CarLocationPointerSession {
  return { pointerId, startX: clientX, startY: clientY, moved: false };
}

export function updateCarLocationPointerIntent(
  session: CarLocationPointerSession,
  pointerId: number,
  clientX: number,
  clientY: number,
) {
  if (session.pointerId !== pointerId || session.moved) return session;

  const moved =
    Math.hypot(clientX - session.startX, clientY - session.startY) >
    CAR_LOCATION_TAP_SLOP_PX;
  return moved ? { ...session, moved: true } : session;
}

export function isIntentionalCarLocationTap(
  session: CarLocationPointerSession | null,
  pointerId: number,
) {
  return session?.pointerId === pointerId && !session.moved;
}
