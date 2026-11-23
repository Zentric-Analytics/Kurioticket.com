import { SavedScreen } from "../src/features/saved/SavedScreen";
import { ProfileThemeProvider } from "../src/theme/AppTheme";

export default function ProfilePage() {
  return <ProfileThemeProvider><SavedScreen /></ProfileThemeProvider>;
}
