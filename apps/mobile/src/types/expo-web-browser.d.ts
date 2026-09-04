declare module "expo-web-browser" {
  export type WebBrowserResult = { type: "cancel" | "dismiss" | "opened" | "locked" };
  export function openBrowserAsync(url: string): Promise<WebBrowserResult>;
}
