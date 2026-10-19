import Svg, { G, Path, Rect } from "react-native-svg";

export type HomeProductIconName = "flight" | "hotel" | "car" | "packages";

/** Filled travel silhouettes, drawn for the Home selector from the supplied reference. */
export function HomeProductIcon({ name, color, cutoutColor, size = 36 }: { name: HomeProductIconName; color: string; cutoutColor: string; size?: number }) {
  const bed = <>
    <Rect x="7" y="7" width="34" height="23" rx="4" fill={color} />
    <Rect x="11" y="14" width="12" height="9" rx="2" fill={cutoutColor} />
    <Rect x="25" y="14" width="12" height="9" rx="2" fill={cutoutColor} />
    <Path d="M7 22h34l4 7v14h-4v-5H7v5H3V29z" fill={color} />
    <Path d="M7 29h34v3H7z" fill={cutoutColor} />
  </>;
  const car = <>
    <Path d="M11 8h26l6 13v20h-6v-5H11v5H5V21z" fill={color} />
    <Path d="m14 12-4 10h28l-4-10z" fill={cutoutColor} />
    <Rect x="9" y="26" width="8" height="4" rx="1" fill={cutoutColor} />
    <Rect x="31" y="26" width="8" height="4" rx="1" fill={cutoutColor} />
    <Rect x="20" y="31" width="8" height="3" rx="1" fill={cutoutColor} />
    <Path d="M2 19h7v4H2zM39 19h7v4h-7z" fill={color} />
  </>;
  return <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {name === "hotel" ? bed : name === "car" ? car : name === "flight" ? <>
      <Path d="m5 8 5-2 19 8-6 7zM27 23l8 19-2 5-14-18z" fill={color} />
      <Path d="M41 3c3-2 6-1 5 3-1 4-7 10-13 16L16 37l-2 9-4-1-1-10-9-3 1-4 9 1L27 12c6-6 10-8 14-9Z" fill={color} />
      <Path d="m36 8 4-3 2 2-3 4z" fill={cutoutColor} />
    </> : <>
      <Path d="m4 4 3-1 7 8h12L22 2h4l9 9h8c5 0 6 4 0 5H30l-7 9h-4l4-9H9L4 13z" fill={color} />
      <G transform="translate(0 22) scale(.52)">{car}</G>
      <Path d="M33 23v-3a4 4 0 0 1 8 0v3h-2v-3a2 2 0 0 0-4 0v3z" fill={color} />
      <Rect x="29" y="23" width="16" height="21" rx="3" fill={color} />
      <Path d="m33 28 7 3-2 5-6-4z" fill={cutoutColor} />
      <Path d="M31 44h3v3h-3zM40 44h3v3h-3z" fill={color} />
    </>}
  </Svg>;
}
