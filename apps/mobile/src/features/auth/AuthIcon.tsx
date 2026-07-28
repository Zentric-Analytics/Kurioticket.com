import Svg, { Circle, Path, Polyline } from "react-native-svg";

export type IconName = "mail" | "user" | "back" | "send" | "lock" | "eye" | "eyeOff" | "userPlus" | "shield" | "check";
export function AuthIcon({ name, color = "#075BE8", size = 24 }: { name: IconName; color?: string; size?: number }) {
  const p: Record<IconName, React.ReactNode> = {
    mail: <><Path d="M3 5h18v14H3z" /><Polyline points="3,6 12,13 21,6" /></>,
    user: <><Circle cx="12" cy="8" r="4" /><Path d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6" /></>,
    back: <><Path d="M19 12H5" /><Polyline points="11,6 5,12 11,18" /></>,
    send: <><Path d="M22 2 10.8 13.2" /><Path d="m22 2-7 20-4.2-8.8L2 9z" /></>,
    lock: <><Path d="M5 10h14v11H5z" /><Path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    eye: <><Path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><Circle cx="12" cy="12" r="2.5" /></>,
    eyeOff: <><Path d="m3 3 18 18" /><Path d="M10.5 6.2A11 11 0 0 1 12 6c6.5 0 10 6 10 6a16 16 0 0 1-3 3.7M6.2 6.2C3.5 8.1 2 12 2 12s3.5 6 10 6a10 10 0 0 0 3-.4" /></>,
    userPlus: <><Circle cx="9" cy="8" r="4" /><Path d="M2 21c.7-4 3-6 7-6 2.2 0 4 .6 5.2 1.8M18 8v6M15 11h6" /></>,
    shield: <><Path d="M12 2 20 5v6c0 5-3.2 9-8 11-4.8-2-8-6-8-11V5z" /><Polyline points="8,12 11,15 16,9" /></>,
    check: <Polyline points="5,12 10,17 20,7" />,
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden>{p[name]}</Svg>;
}
