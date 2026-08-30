import { getAirportByCode } from "../../data/airports";

export type LocationFieldDisplay = { primary: string; secondary?: string; code?: string };
const trailingAirportCode = /\(([A-Za-z0-9]{3})\)\s*$/;

/** Turns persisted location labels into compact, self-explanatory display lines. */
export function getLocationFieldDisplay(value: string): LocationFieldDisplay {
  const trimmed = value.trim();
  if (!trimmed) return { primary: "" };
  const match = trimmed.match(trailingAirportCode);
  if (!match) return { primary: trimmed };

  const code = match[1].toUpperCase();
  const selectedName = trimmed.slice(0, match.index).trim();
  const airport = getAirportByCode(code);
  const fullName = airport?.airport?.trim() || selectedName;
  const city = airport?.city?.trim();
  const secondary = [fullName, city && city !== fullName ? city : ""].filter(Boolean).join(" · ");
  return { primary: code, secondary: secondary || selectedName, code };
}
