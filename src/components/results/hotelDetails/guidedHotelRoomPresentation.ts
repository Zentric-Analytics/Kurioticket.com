import type { HotelRoomOption } from "@/lib/hotels/hotelRoomOptions";

export function getLowestEstimateRoomId(
  roomOptions: HotelRoomOption[],
): string {
  if (roomOptions.length === 0) return "";

  return roomOptions.reduce((lowest, option) =>
    option.totalPrice < lowest.totalPrice ? option : lowest,
  ).id;
}
