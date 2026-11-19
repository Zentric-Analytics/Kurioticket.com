import { SecurityScreen } from "../src/features/profile/SecurityScreen";
import { ProfileThemeProvider } from "../src/theme/AppTheme";

export default function ProfilePage() {
  return <ProfileThemeProvider><SecurityScreen /></ProfileThemeProvider>;
}
