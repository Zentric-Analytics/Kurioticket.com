import Svg, { Circle, G, Path, Rect } from "react-native-svg";

type RecentSearchIllustrationProps = {
  border: string;
  surface: string;
  muted: string;
};

export function RecentSearchIllustration({ border, surface, muted }: RecentSearchIllustrationProps) {
  return <Svg
    width="100%"
    height="100%"
    viewBox="0 0 220 198"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    <Circle cx="109" cy="99" r="82" fill={surface} stroke={border} strokeWidth="2" />
    <Path d="M26 170c39 12 129 12 168 0" fill="none" stroke={border} strokeLinecap="round" strokeWidth="5" />

    <G transform="rotate(-5 104 104)">
      <Rect x="40" y="48" width="130" height="116" rx="14" fill={surface} stroke={border} strokeWidth="2" />
      <Path d="M40 74h130" stroke={border} strokeWidth="2" />
      <Circle cx="56" cy="61" r="4" fill="#F59E0B" />
      <Circle cx="69" cy="61" r="4" fill="#3BA5B7" />

      <Circle cx="67" cy="98" r="13" fill="#E8F0FE" />
      <Path d="m57 100 10-4 5-7 3 2-4 7 8 2c2 1 2 3 0 4l-9-1 2 6-4 1-5-8-6 1Z" fill="#1769E0" />
      <Path d="M89 92h58M89 102h42" stroke={muted} strokeLinecap="round" strokeWidth="3" opacity=".7" />

      <Circle cx="67" cy="134" r="13" fill="#FFF1CF" />
      <Path d="M59 139v-16h16v16M57 139h20M63 128h3m3 0h3m-9 5h3m3 0h3" fill="none" stroke="#D48600" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <Path d="M89 128h52M89 138h35" stroke={muted} strokeLinecap="round" strokeWidth="3" opacity=".7" />
    </G>

    <G transform="translate(144 20)">
      <Circle cx="25" cy="25" r="24" fill="#1769E0" />
      <Circle cx="25" cy="25" r="13" fill="none" stroke="#FFFFFF" strokeWidth="3" />
      <Path d="M25 17v9l7 4" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      <Path d="m10 8 1 9 8-2" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </G>
  </Svg>;
}
