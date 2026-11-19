import { PersonalDetailsScreen } from "../src/features/personal-details/PersonalDetailsScreen";
import { ProfileThemeProvider } from "../src/theme/AppTheme";

export default function ProfilePage() {
  return <ProfileThemeProvider><PersonalDetailsScreen /></ProfileThemeProvider>;
}
