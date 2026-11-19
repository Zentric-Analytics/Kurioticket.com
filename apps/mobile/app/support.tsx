import { SupportScreen } from "../src/features/account/NativeAccountScreens";
import { ProfileThemeProvider } from "../src/theme/AppTheme";

export default function ProfilePage() {
  return <ProfileThemeProvider><SupportScreen /></ProfileThemeProvider>;
}
