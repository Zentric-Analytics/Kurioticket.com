import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { ExploreScreen } from "../../src/features/explore/ExploreScreen";
import { FlowIcon } from "../../src/features/flow/FlowIcon";

const NAVY = "#071A48";
const BLUE = "#0754F