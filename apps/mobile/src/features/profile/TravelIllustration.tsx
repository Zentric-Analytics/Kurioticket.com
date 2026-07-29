import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

export function TravelIllustration({ signIn = false }: { signIn?: boolean }) {
  return <Svg width="100%" height="100%" viewBox="0 0 520 230" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path fill="#F1F6FF" d="M0 108c52-47 99-27 132 0 40-61 99-58 139 2 45-46 101-40 133 8 47-37 83-21 116 5v107H0Z" />
    <Path fill="#DCE9FF" d="M0 155 55 112l34 29 47-70 54 73 55-52 47 60 44-85 58 71 45-41 81 70v63H0Z" opacity=".62" />
    <G fill="#C8DAF8" opacity=".8">
      <Rect x="28" y="128" width="45" height="74" rx="3" /><Rect x="82" y="148" width="32" height="54" rx="3" />
      <Rect x="405" y="117" width="43" height="85" rx="3" /><Rect x="455" y="143" width="35" height="59" rx="3" />
    </G>
    {signIn ? <>
      <G transform="translate(50 74)"><Rect fill="#0754F7" x="0" y="33" width="72" height="100" rx="5" /><Rect fill="#2F77FF" x="8" y="44" width="56" height="89" /><Path stroke="white" strokeWidth="3" d="M20 61h10M42 61h10M20 78h10M42 78h10M20 95h10M42 95h10" /><Rect fill="#061747" x="-7" y="54" width="13" height="61" rx="2" /><Path fill="white" d="M-2 62h3v8h-3zm0 13h3v8h-3zm0 13h3v8h-3zm0 13h3v8h-3z" /></G>
      <G transform="translate(164 141)"><Path fill="#0754F7" d="M8 28 22 5h88l19 23 6 36H0Z" /><Rect fill="#77A8FF" x="26" y="12" width="77" height="23" rx="7" /><Circle fill="#061747" cx="27" cy="63" r="12" /><Circle fill="#061747" cx="108" cy="63" r="12" /></G>
      <G transform="translate(180 16) rotate(8)"><Path fill="#4D86F7" d="m0 29 73-9 31-18 10 5-19 18 45 5c8 1 13 6 13 10s-6 7-14 7l-47-2 16 25-11 3-27-29-64 4Z" /></G>
    </> : <>
      <G transform="translate(323 163)"><Path fill="#0754F7" d="M4 18 15 2h60l14 16 4 25H0Z" /><Rect fill="#7CAEFF" x="20" y="7" width="49" height="16" rx="5" /><Circle fill="#061747" cx="18" cy="43" r="8" /><Circle fill="#061747" cx="76" cy="43" r="8" /></G>
      <Path fill="#F4D5A2" d="M142 183c19-31 50-31 70 0-19 12-50 12-70 0Z" /><Path fill="#0B1B43" d="M151 174c13-27 38-29 53-3-15 7-35 8-53 3Z" />
    </>}
    <G transform={signIn ? "translate(370 91)" : "translate(205 65)"}>
      <Rect fill="#0754F7" x="10" y="24" width="88" height="120" rx="17" /><Rect fill="#3980FF" x="20" y="32" width="12" height="103" rx="6" /><Rect fill="#3980FF" x="45" y="32" width="12" height="103" rx="6" /><Rect fill="#3980FF" x="70" y="32" width="12" height="103" rx="6" />
      <Path fill="none" stroke="#071A48" strokeWidth="7" d="M32 27V8c0-6 5-8 11-8h22c6 0 11 2 11 8v19" /><Circle fill="#071A48" cx="29" cy="147" r="7" /><Circle fill="#071A48" cx="80" cy="147" r="7" />
    </G>
    <Ellipse fill="#BCD2F7" cx="259" cy="219" rx="190" ry="8" opacity=".55" />
  </Svg>;
}
