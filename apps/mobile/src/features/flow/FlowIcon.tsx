import type { ReactNode } from "react";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

export type FlowIconName =
  | "back" | "bell" | "calendar" | "car" | "card" | "check" | "chevron"
  | "compass" | "deal" | "flight" | "home" | "hotel" | "location" | "more"
  | "person" | "plus" | "search" | "settings" | "share" | "swap" | "trip"
  | "people" | "sliders" | "help" | "headset" | "document" | "shield"
  | "globe" | "currency" | "moon" | "logout"
  | "heart" | "trending" | "map" | "beach" | "city" | "adventure"
  | "nature" | "culture" | "family";

export function FlowIcon({ name, size = 24, color = "#071A48", fill = "none" }: { name: FlowIconName; size?: number; color?: string; fill?: string }) {
  const line = { fill: "none", stroke: color, strokeWidth: 2.1, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const filledLine = { ...line, fill };
  const icons: Record<FlowIconName, ReactNode> = {
    back: <Path {...line} d="m15 5-7 7 7 7M8 12h12" />,
    bell: <><Path {...line} d="M6.5 17.5h11l-1.5-2.3v-4.1a4 4 0 0 0-8 0v4.1l-1.5 2.3Z" /><Path {...line} d="M10 20h4" /></>,
    calendar: <><Rect {...line} x="4" y="5" width="16" height="15" rx="2" /><Path {...line} d="M8 3v5M16 3v5M4 10h16" /></>,
    car: <><Path {...line} d="m5 15 1.6-5h10.8l1.6 5M4 15h16v4H4zM7 19v2M17 19v2" /><Circle {...line} cx="7" cy="16.8" r=".8" /><Circle {...line} cx="17" cy="16.8" r=".8" /></>,
    card: <><Rect {...line} x="3" y="6" width="18" height="13" rx="2" /><Path {...line} d="M3 10h18M7 15h4" /></>,
    check: <Path {...line} d="m5 12 4 4L19 6" />,
    chevron: <Path {...line} d="m9 6 6 6-6 6" />,
    compass: <><Circle {...line} cx="12" cy="12" r="9" /><Path {...line} d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
    deal: <><Path {...line} d="M4 11V5h6l10 10-6 6L4 11Z" /><Circle {...line} cx="8" cy="8.5" r="1" /></>,
    flight: <Path {...line} d="m3 13 7.5-2.5L8 4l2-1 5 6 5-1.5c1.5-.4 2.4.2 2.6 1 .2.9-.6 1.7-1.8 2.2L15 13l-2 7-2 .7.2-6L5 17l-2-4Z" />,
    home: <><Path {...line} d="m3.5 11 8.5-7 8.5 7" /><Path {...line} d="M5.5 10v10h13V10M9.5 20v-6h5v6" /></>,
    hotel: <><Path {...line} d="M4 21V5h11v16M15 10h5v11M8 9h3M8 13h3M8 17h3" /></>,
    location: <><Path {...line} d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><Circle {...line} cx="12" cy="10" r="2.3" /></>,
    more: <><Circle fill={color} cx="5" cy="12" r="1.5" /><Circle fill={color} cx="12" cy="12" r="1.5" /><Circle fill={color} cx="19" cy="12" r="1.5" /></>,
    person: <><Circle {...line} cx="12" cy="8" r="4" /><Path {...line} d="M4.5 21c.8-4.2 3.3-6 7.5-6s6.7 1.8 7.5 6" /></>,
    plus: <Path {...line} d="M12 5v14M5 12h14" />,
    search: <><Circle {...line} cx="10.5" cy="10.5" r="6.5" /><Path {...line} d="m15.5 15.5 5 5" /></>,
    settings: <><Circle {...line} cx="12" cy="12" r="3" /><Path {...line} d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></>,
    share: <><Circle {...line} cx="18" cy="5" r="2.5" /><Circle {...line} cx="6" cy="12" r="2.5" /><Circle {...line} cx="18" cy="19" r="2.5" /><Path {...line} d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" /></>,
    swap: <><Path {...line} d="M8 4v16M5 17l3 3 3-3M16 20V4M13 7l3-3 3 3" /></>,
    trip: <><Rect {...line} x="5" y="7" width="14" height="13" rx="2" /><Path {...line} d="M9 7V5h6v2M9 12h6" /></>,
    people: <><Circle {...line} cx="9" cy="8" r="3" /><Path {...line} d="M3.5 19c.5-3.4 2.3-5 5.5-5s5 1.6 5.5 5" /><Path {...line} d="M15 5.5a3 3 0 0 1 0 5.5M16 14c2.7.2 4.1 1.8 4.5 4.5" /></>,
    sliders: <><Line {...line} x1="4" y1="7" x2="20" y2="7" /><Circle {...line} cx="9" cy="7" r="2" /><Line {...line} x1="4" y1="17" x2="20" y2="17" /><Circle {...line} cx="15" cy="17" r="2" /></>,
    help: <><Circle {...line} cx="12" cy="12" r="9" /><Path {...line} d="M9.7 9a2.4 2.4 0 1 1 3.1 2.3c-.8.3-.8 1-.8 1.7M12 17h.01" /></>,
    headset: <><Path {...line} d="M4 13v-1a8 8 0 0 1 16 0v1M4 13h3v6H5a1 1 0 0 1-1-1v-5ZM20 13h-3v6h2a1 1 0 0 0 1-1v-5ZM17 19c0 1.1-.9 2-2 2h-2" /></>,
    document: <><Path {...line} d="M6 3h8l4 4v14H6z" /><Path {...line} d="M14 3v5h4M9 12h6M9 16h6" /></>,
    shield: <><Path {...line} d="M12 3 20 6v6c0 5-3.3 8-8 10-4.7-2-8-5-8-10V6l8-3Z" /><Path {...line} d="m8.5 12 2.2 2.2 4.8-5" /></>,
    globe: <><Circle {...line} cx="12" cy="12" r="9" /><Path {...line} d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9S14.5 18.5 12 21M12 3C9.5 5.5 8.5 8.5 8.5 12s1 6.5 3.5 9" /></>,
    currency: <><Circle {...line} cx="12" cy="12" r="9" /><Path {...line} d="M15 8.5c-.7-.7-1.7-1-3-1-1.7 0-3 .8-3 2s1 1.8 3 2.3 3 1.1 3 2.4-1.3 2.3-3 2.3c-1.3 0-2.5-.4-3.2-1.2M12 5.5v13" /></>,
    moon: <Path {...line} d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
    logout: <><Path {...line} d="M10 5H5v14h5M13 8l4 4-4 4M8 12h9" /></>,
    heart: <Path {...(fill === "none" ? line : filledLine)} d="M20.5 9c0 5-8.5 10-8.5 10S3.5 14 3.5 9A4.5 4.5 0 0 1 12 6.8 4.5 4.5 0 0 1 20.5 9Z" />,
    trending: <Path {...line} d="m4 17 5-5 4 4 7-8M15 8h5v5" />,
    map: <Path {...line} d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Zm5-2v14M15 6v14" />,
    beach: <><Path {...line} d="M4 13c3-6 8-8 15-4M12 8l-2 12M5 20h14" /><Path {...line} d="M8 10c0-3-2-4-4-4M12 8c1-3 4-4 6-2" /></>,
    city: <><Path {...line} d="M5 21V9h6v12M11 21V4h8v17M8 12h.01M8 16h.01M14 8h2M14 12h2M14 16h2" /></>,
    adventure: <><Path {...line} d="m3 20 7-13 4 7 2-4 5 10H3Z" /><Path {...line} d="m8.5 10 2 2 2-2" /></>,
    nature: <><Path {...line} d="M19 4C9 5 5 10 6 18c8 1 13-4 13-14Z" /><Path {...line} d="M5 20c3-5 6-8 11-11" /></>,
    culture: <><Path {...line} d="m3 9 9-5 9 5M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M4 19h16M3 21h18" /></>,
    family: <><Circle {...line} cx="8" cy="8" r="2.5" /><Circle {...line} cx="16" cy="7" r="2.5" /><Circle {...line} cx="12" cy="13" r="2" /><Path {...line} d="M3 20c.5-4 2-6 5-6 1.2 0 2.2.3 3 .9M21 20c-.5-4-2-6-5-6-1.2 0-2.2.3-3 .9M8 21c.3-3 1.5-4.5 4-4.5s3.7 1.5 4 4.5" /></>,
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{icons[name]}</Svg>;
}
