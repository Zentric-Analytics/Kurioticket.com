import { useEffect, useState } from "react";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { ParamListBase } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { ExploreScreen } from "../../src/features/explore/ExploreScreen";

export default function ExploreTab() {
  const navigation = useNavigation<BottomTabNavigationProp<ParamListBase>>();
  const [visitKey, setVisitKey] = useState(0);

  useEffect(() => {
    return navigation.addListener("tabPress", () => {
      if (!navigation.isFocused()) setVisitKey((current) => current + 1);
    });
  }, [navigation]);

  return <ExploreScreen key={visitKey} />;
}
