import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const CURRENCY_KEY = "kurioticket.preferences.currency.v1";
const GUEST_CURRENCY_KEY = "kurioticket.preferences.currency.guest.v1";
const DARK_MODE_KEY = "kurioticket.preferences.dark-mode.v1";

function webStorage() {
  return (globalThis as { localStorage?: Storage }).localStorage;
}

export async function readCurrency() {
  return (await readCurrencyPreference()) || "USD";
}

/** Returns null when the user has not made an explicit currency selection. */
export async function readCurrencyPreference() {
  const value =
    Platform.OS === "web"
      ? webStorage()?.getItem(CURRENCY_KEY)
      : await SecureStore.getItemAsync(CURRENCY_KEY);
  return value || null;
}

export async function writeCurrency(currency: string) {
  if (Platform.OS === "web") webStorage()?.setItem(CURRENCY_KEY, currency);
  else
    await SecureStore.setItemAsync(CURRENCY_KEY, currency, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
}
export async function readGuestCurrency() {
  const value = Platform.OS === "web" ? webStorage()?.getItem(GUEST_CURRENCY_KEY) : await SecureStore.getItemAsync(GUEST_CURRENCY_KEY);
  return value || await readCurrency();
}
export async function writeGuestCurrency(currency: string) {
  if (Platform.OS === "web") webStorage()?.setItem(GUEST_CURRENCY_KEY, currency);
  else await SecureStore.setItemAsync(GUEST_CURRENCY_KEY, currency, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  await writeCurrency(currency);
}

export async function readDarkMode() {
  const value =
    Platform.OS === "web"
      ? webStorage()?.getItem(DARK_MODE_KEY)
      : await SecureStore.getItemAsync(DARK_MODE_KEY);
  return value === "true";
}

export async function writeDarkMode(enabled: boolean) {
  const value = String(enabled);
  if (Platform.OS === "web") webStorage()?.setItem(DARK_MODE_KEY, value);
  else
    await SecureStore.setItemAsync(DARK_MODE_KEY, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
}
