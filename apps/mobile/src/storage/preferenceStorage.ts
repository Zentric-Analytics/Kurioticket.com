import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const CURRENCY_KEY = "kurioticket.preferences.currency.v1";

function webStorage() {
  return (globalThis as { localStorage?: Storage }).localStorage;
}

export async function readCurrency() {
  const value =
    Platform.OS === "web"
      ? webStorage()?.getItem(CURRENCY_KEY)
      : await SecureStore.getItemAsync(CURRENCY_KEY);
  return value || "USD";
}

export async function writeCurrency(currency: string) {
  if (Platform.OS === "web") webStorage()?.setItem(CURRENCY_KEY, currency);
  else
    await SecureStore.setItemAsync(CURRENCY_KEY, currency, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
}
