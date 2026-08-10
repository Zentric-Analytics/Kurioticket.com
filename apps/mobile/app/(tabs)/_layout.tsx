import { Tabs } from "expo-router";
import { KurioticketTabBar } from "../../src/features/tabs/KurioticketTabBar";
import { useAppTheme } from "../../src/theme/AppTheme";

export default function AppTabsLayout() {
  const { theme } = useAppTheme();
  return (
    <Tabs
      tabBar={(props) => <KurioticketTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="trips" options={{ title: "My Trips", tabBarAccessibilityLabel: "My Trips" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
