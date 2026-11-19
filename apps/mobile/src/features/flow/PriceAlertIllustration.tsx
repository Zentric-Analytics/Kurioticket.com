import Svg, { Circle, G, Path, Rect } from "react-native-svg";

type PriceAlertIllustrationProps = {
  border: string;
  surface: string;
  muted: string;
};

export function PriceAlertIllustration({ border, surface, muted }: PriceAlertIllustrationProps) {
  return <Svg
    width="100%"
    height="100%"
    viewBox="0 0 220 198"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    <Circle cx="110" cy="99" r="82" fill={surface} stroke={border} strokeWidth="2" />
    <Path d="M27 171c43 11 123 11 166 0" fill="none" stroke={border} strokeLinecap="round" strokeWidth="5" />

    <G transform="rotate(-4 105 105)">
      <Rect x="35" y="53" width="146" height="105" rx="15" fill={surface} stroke={border} strokeWidth="2" />
      <Path d="M52 130 78 111l25 9 28-34 28 10" fill="none" stroke="#3BA5B7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <Circle cx="52" cy="130" r="4" fill="#3BA5B7" />
      <Circle cx="78" cy="111" r="4" fill="#3BA5B7" />
      <Circle cx="103" cy="120" r="4" fill="#3BA5B7" />
      <Circle cx="131" cy="86" r="4" fill="#3BA5B7" />
      <Path d="m65 91 27-10 17-19 6 3-12 19 24 5c5 1 5 6 0 7l-27-1 3 17-7 2-12-19-18 3Z" fill="#1769E0" />
      <Rect x="120" y="118" width="47" height="27" rx="7" fill="#FFF1CF" />
      <Path d="M131 132h25" stroke="#D48600" strokeLinecap="round" strokeWidth="3" />
      <Path d="M139 126v12m8-12v12" stroke="#D48600" strokeLinecap="round" strokeWidth="2" opacity=".75" />
      <Path d="M49 144h55" stroke={muted} strokeLinecap="round" strokeWidth="3" opacity=".45" />
    </G>

    <G transform="translate(151 18)">
      <Circle cx="24" cy="24" r="23" fill="#1769E0" />
      <Path d="M16 28h16l-3-4v-5a5 5 0 0 0-10 0v5Zm6 5h4" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      <Circle cx="36" cy="10" r="7" fill="#F59E0B" stroke={surface} strokeWidth="2" />
    </G>
  </Svg>;
}
