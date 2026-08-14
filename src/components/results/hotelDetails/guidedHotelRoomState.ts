import type { HotelRoomOption } from "@/lib/hotels/hotelRoomOptions";

export type GuidedHotelRoomState =
  | "selection-required"
  | "room-options-unavailable"
  | "selected-room";

export function findGuidedHotelRoom(
  roomOptions: readonly HotelRoomOption[],
  selectedRoomId: string,
): HotelRoomOption | null {
  return roomOptions.find((option) => option.id === selectedRoomId) ?? null;
}

export function getGuidedHotelRoomState(
  roomOptions: readonly HotelRoomOption[],
  selectedRoom: HotelRoomOption | null,
): GuidedHotelRoomState {
  if (selectedRoom) return "selected-room";
  return roomOptions.length > 0
    ? "selection-required"
    : "room-options-unavailable";
}

export function getHotelDetailsTaxesAndFeesIncluded(
  mode: "standalone" | "guided",
  hotelTaxesAndFeesIncluded: boolean | undefined,
  selectedRoom: HotelRoomOption | null,
): boolean | undefined {
  return mode === "guided"
    ? selectedRoom?.taxesAndFeesIncluded
    : hotelTaxesAndFeesIncluded;
}
