import Svg, { Circle, G, Path, Rect } from "react-native-svg";

type SavedTravelIllustrationProps = {
  border: string;
  surface: string;
  muted: string;
};

export function SavedTravelIllustration({ border, surface, muted }: SavedTravelIllustrationProps) {
  return <Svg
    width="100%"
    height="100%"
    viewBox="0 0 220 198"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    <Circle cx="110" cy="96" r="82" fill={surface} stroke={border} strokeWidth="2" />
    <Path d="M26 165c35 13 133 14 169 0" fill="none" stroke={border} strokeLinecap="round" strokeWidth="5" />

    <G transform="rotate(-7 88 103)">
      <Rect x="35" y="55" width="108" height="104" rx="13" fill={surface} stroke={border} strokeWidth="2" />
      <Path d="M35 79h108" stroke={border} strokeWidth="2" />
      <Circle cx="51" cy="67" r="4" fill="#F59E0B" />
      <Circle cx="64" cy="67" r="4" fill="#3BA5B7" />
      <Path d="M51 100h31v42H51z" fill="#FFCA59" />
      <Path d="M58 107h6v8h-6zm12 0h6v8h-6zm-12 14h6v8h-6zm12 0h6v8h-6z" fill="#1769E0" />
      <Path d="M92 101h36M92 112h30M92 131h34M92 141h25" stroke={muted} strokeLinecap="round" strokeWidth="3" opacity=".7" />
    </G>

    <G transform="translate(118 30) rotate(11)">
      <Path d="m0 26 37-7L53 3l7 4-10 16 29 4c5 1 8 4 8 7 0 4-4 6-9 6l-31-1 10 17-8 3-19-21-28 3Z" fill="#5E9AF4" stroke="#1769E0" strokeLinejoin="round" strokeWidth="1.5" />
      <Path d="m29 22-17-13 7-2 25 13ZM31 37 15 52l8 1 21-15Z" fill="#1769E0" />
    </G>

    <G transform="translate(137 111)">
      <Circle cx="25" cy="25" r="25" fill="#1769E0" />
      <Path d="M25 39 12 27c-8-8 3-19 11-11l2 2 2-2c8-8 19 3 11 11Z" fill="#FFFFFF" />
    </G>
  </Svg>;
}
