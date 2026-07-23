import { Tabs } from "expo-router";
import { KurioticketTabBar } from "../../src/features/tabs/KurioticketTabBar";
import { colors } from "../../src/theme/tokens";

export default function AppTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <KurioticketTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Search" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="trips" options={{ title: "Trips" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
