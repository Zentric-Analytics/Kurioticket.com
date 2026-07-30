import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

function Skyline() {
  return <G opacity=".62">
    <Path fill="#D9E7FF" d="M0 155 35 126l31 17 36-51 35 47 32-71 30 73 34-48 29 48 27-80 31 78 38-52 34 54 36-35 52 47 41-29 19 18v58H0Z" />
    <G fill="#C5D9FA">
      <Rect x="42" y="118" width="43" height="69" rx="3" /><Path d="m39 118 25-19 25 19Z" />
      <Rect x="96" y="138" width="31" height="49" rx="2" /><Path d="m92 138 20-15 20 15Z" />
      <Rect x="167" y="111" width="26" height="76" /><Path d="m164 111 16-30 16 30Z" />
      <Rect x="334" y="99" width="30" height="88" /><Path d="m331 99 18-31 18 31Z" />
      <Rect x="374" y="124" width="28" height="63" /><Path d="m370 124 18-22 18 22Z" />
      <Rect x="423" y="108" width="39" height="79" rx="2" /><Path d="m419 108 24-25 23 25Z" />
    </G>
    <G fill="#EAF2FF">
      <Rect x="52" y="132" width="7" height="12" rx="1" /><Rect x="68" y="132" width="7" height="12" rx="1" /><Rect x="52" y="151" width="7" height="12" rx="1" /><Rect x="68" y="151" width="7" height="12" rx="1" />
      <Rect x="342" y="114" width="6" height="12" rx="1" /><Rect x="353" y="114" width="6" height="12" rx="1" /><Rect x="342" y="134" width="6" height="12" rx="1" /><Rect x="353" y="134" width="6" height="12" rx="1" />
      <Rect x="433" y="123" width="7" height="12" rx="1" /><Rect x="448" y="123" width="7" height="12" rx="1" />
    </G>
  </G>;
}
function Clouds() {
  return <G fill="#FFFFFF" opacity=".8">
    <Path d="M25 83c3-14 21-17 29-6 8-9 25-5 26 9H25Z" />
    <Path d="M424 63c4-17 25-20 34-7 11-12 31-5 32 12h-66Z" />
    <Path d="M116 48c3-11 17-13 23-5 7-7 20-3 21 7h-44Z" />
  </G>;
}
function Birds() {
  return <G fill="none" stroke="#8BB4FF" strokeLinecap="round" strokeWidth="1.7" opacity=".8">
    <Path d="M364 64q7-7 14 0 7-7 14 0M295 91q5-5 10 0 5-5 10 0M183 75q5-5 10 0 5-5 10 0" />
  </G>;
}
function Leaves({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <G transform={`translate(${x} ${y}) scale(${scale})`}>
    <Path fill="#5BAFC2" d="M23 42C2 34-4 16 2 1c17 7 26 22 21 41Z" /><Path fill="#2389A8" d="M23 42C40 23 55 23 66 30 55 45 40 50 23 42Z" />
    <Path fill="none" stroke="#187994" strokeWidth="2" d="M23 43 8 12M23 43l29-12" />
  </G>;
}
function Suitcase({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <G transform={`translate(${x} ${y}) scale(${scale})`}>
    <Defs><LinearGradient id={`case-${x}`} x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#75AEFF" /><Stop offset=".42" stopColor="#1262E9" /><Stop offset="1" stopColor="#0641B5" /></LinearGradient></Defs>
    <Path fill="none" stroke="#142B5F" strokeLinecap="round" strokeWidth="7" d="M34 30V8c0-6 5-8 11-8h23c7 0 12 2 12 8v22" /><Rect fill="#314B80" x="38" y="2" width="38" height="8" rx="3" />
    <Rect fill={`url(#case-${x})`} stroke="#083DA6" strokeWidth="2" x="8" y="27" width="96" height="125" rx="18" />
    <Path fill="#A4C8FF" opacity=".7" d="M20 43c0-6 5-10 10-10h7v111h-7c-5 0-10-4-10-10ZM48 34h11v110H48ZM70 34h11v110H70Z" />
    <Rect fill="#082D7F" x="95" y="48" width="6" height="37" rx="3" /><Circle fill="#071A48" cx="27" cy="157" r="8" /><Circle fill="#071A48" cx="86" cy="157" r="8" /><Circle fill="#6D8FC5" cx="27" cy="157" r="3" /><Circle fill="#6D8FC5" cx="86" cy="157" r="3" />
  </G>;
}
function Car({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <G transform={`translate(${x} ${y}) scale(${scale})`}>
    <Defs><LinearGradient id={`car-${x}`} x1="0" y1="0" x2="0" y2="1"><Stop stopColor="#58A0FF" /><Stop offset=".5" stopColor="#0754D8" /><Stop offset="1" stopColor="#043789" /></LinearGradient></Defs>
    <Path fill={`url(#car-${x})`} stroke="#06358C" strokeWidth="2" d="m8 34 15-25c3-5 8-8 14-8h50c7 0 12 3 16 9l14 24c5 2 9 8 9 14v24H0V48c0-7 3-12 8-14Z" />
    <Path fill="#274D8C" d="m29 13-11 21h91L97 13c-2-4-6-6-11-6H40c-5 0-9 2-11 6Z" /><Path fill="#77B2FF" opacity=".55" d="M35 12h23v18H25ZM65 12h24c3 0 5 2 7 5l7 13H65Z" />
    <Path fill="#D8EBFF" d="M9 42h22l-4 13H7ZM96 42h22l2 13H99Z" /><Rect fill="#82B8FF" x="44" y="51" width="39" height="9" rx="3" /><Rect fill="#D5E7FF" x="49" y="58" width="30" height="8" rx="2" />
    <Path fill="#031B4A" d="M10 68h21v9c0 8-5 13-11 13S10 85 10 77ZM96 68h21v9c0 8-5 13-11 13s-10-5-10-13Z" /><Path fill="#0A2961" d="M34 68h58v5H34Z" />
  </G>;
}
function Hat() {
  return <G transform="translate(145 162) rotate(-4)">
    <Defs><LinearGradient id="hat" x1="0" y1="0" x2="0" y2="1"><Stop stopColor="#FFE8B8" /><Stop offset="1" stopColor="#D9B276" /></LinearGradient></Defs>
    <Ellipse fill="#C59A5D" opacity=".3" cx="44" cy="51" rx="55" ry="8" /><Path fill="url(#hat)" stroke="#CDA56A" d="M4 45c15-15 66-17 83-1 7 6 3 12-5 15-22 8-59 7-78-2-7-3-7-8 0-12Z" /><Path fill="url(#hat)" stroke="#CDA56A" d="M25 42c0-25 10-38 25-38 17 0 28 15 28 39-18 7-38 7-53-1Z" /><Path fill="#132653" d="M24 31c16 7 37 7 54 0l1 11c-19 8-39 8-56 0Z" />
  </G>;
}
function Hotel() {
  return <G transform="translate(42 73)">
    <Defs><LinearGradient id="hotel" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#85B8FF" /><Stop offset=".55" stopColor="#1D6BEA" /><Stop offset="1" stopColor="#0643B8" /></LinearGradient></Defs>
    <Rect fill="#D8E8FF" x="16" y="5" width="90" height="14" rx="2" /><Rect fill="#B9D3FF" x="9" y="18" width="105" height="10" rx="2" /><Rect fill="url(#hotel)" x="20" y="28" width="85" height="122" /><Rect fill="#074BDB" x="6" y="39" width="20" height="91" rx="2" />
    <Path fill="white" d="M12 50h3v15h-3zm0 24h3v15h-3zm0 24h3v15h-3z" /><G fill="#8EC0FF"><Rect x="40" y="48" width="14" height="20" /><Rect x="70" y="48" width="14" height="20" /><Rect x="40" y="80" width="14" height="20" /><Rect x="70" y="80" width="14" height="20" /></G>
    <Rect fill="#0A3A96" x="59" y="116" width="27" height="34" /><Rect fill="#DCEAFF" x="13" y="148" width="101" height="8" />
  </G>;
}
function Plane() {
  return <G transform="translate(178 20) rotate(7)">
    <Defs><LinearGradient id="plane" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#DCEBFF" /><Stop offset=".45" stopColor="#72A8FF" /><Stop offset="1" stopColor="#2869DD" /></LinearGradient></Defs>
    <Path fill="url(#plane)" stroke="#5A8EE5" strokeWidth="1" d="m0 34 76-10 34-20 12 5-22 21 48 5c9 1 15 5 15 10 0 6-7 9-16 9l-51-2 18 26-13 4-31-32-65 5Z" />
    <Path fill="#356FD7" d="m56 31-33-21 12-3 50 19ZM69 48 39 72l14 2 41-25Z" /><Circle fill="#173F87" cx="106" cy="37" r="5" /><Circle fill="#173F87" cx="122" cy="38" r="5" />
  </G>;
}

export function TravelIllustration({ signIn = false }: { signIn?: boolean }) {
  return <Svg width="100%" height="100%" viewBox="0 0 520 230" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Defs><LinearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><Stop stopColor="#F6F9FF" /><Stop offset="1" stopColor="#E8F1FF" /></LinearGradient></Defs>
    <Rect fill="url(#ground)" width="520" height="230" /><Clouds /><Skyline /><Birds />
    {signIn ? <>
      <Path fill="none" stroke="#80AFFF" strokeDasharray="5 5" strokeWidth="1.5" d="M285 67c-34 17-37 42-6 54 21 9 18 28 5 38" opacity=".8" />
      <Leaves x={14} y={151} scale={.7} /><Leaves x={415} y={149} scale={.72} /><Hotel /><Car x={192} y={139} scale={.72} /><Suitcase x={377} y={87} scale={.72} /><Plane />
    </> : <>
      <Leaves x={214} y={153} scale={.72} /><Suitcase x={214} y={57} scale={.82} /><Hat /><Car x={375} y={166} scale={.48} />
    </>}
    <Ellipse fill="#AFC7EB" cx="263" cy="218" rx={signIn ? 212 : 170} ry="8" opacity=".38" />
  </Svg>;
}
