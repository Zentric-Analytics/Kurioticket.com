import assert from "node:assert/strict";
import test from "node:test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

// Execute the actual native component/hooks in a DOM host. This is not a
// physical-device or React Native renderer certification.
const nativeHost = `const React=require('react');
exports.View=({children,style})=>React.createElement('div',{style},children);
exports.ScrollView=({children,contentContainerStyle})=>React.createElement('div',{style:contentContainerStyle},children);
exports.Text=({children,style,accessibilityRole})=>React.createElement(accessibilityRole==='header'?'h2':'p',{style,role:accessibilityRole==='alert'?'alert':undefined},children);
exports.ActivityIndicator=({accessibilityLabel})=>React.createElement('div',{role:'status','aria-label':accessibilityLabel},accessibilityLabel);
exports.Pressable=({children,onPress,disabled,style})=>React.createElement('button',{onClick:onPress,disabled,style},children);`;
const bundle = () => componentBundle({ recovery: "apps/mobile/src/features/auth/MobileRecoveryBoundary.tsx" }, {
  "react-native": nativeHost,
  "react-native-safe-area-context": "exports.SafeAreaView=({children,style})=>require('react').createElement('div',{'data-safe-area':'true',style},children);",
  "expo-router": "exports.router={replace:url=>window.fixtureNavigation.push(url)};",
  "expo-splash-screen": "exports.hideAsync=async()=>{window.fixtureSplashHidden=true;};",
  "./authApi": "exports.authApi={recoveryStatus:()=>window.fixtureStatus()};",
  "../../api/travelApi": "exports.travelApi={reactivateDeletion:()=>{window.fixtureRecoveries++;return window.fixtureRecovery();}};",
  "../../storage/sessionStorage": "exports.readSession=async()=>window.fixtureSession;exports.subscribeSession=listener=>{window.fixtureListener=listener;return()=>{window.fixtureListener=null;};};exports.clearSession=async()=>{window.fixtureSession=null;window.fixtureListener?.(null);};",
  "../../theme/AppTheme": "exports.useAppTheme=()=>({theme:{background:'#FAFBFF',text:'#071A48',muted:'#56658E',border:'#E7ECF5'}});",
});
const setup = (extra = "") => `const React=require('react'),{createRoot}=require('react-dom/client'),{MobileRecoveryBoundary}=require('recovery');
window.fixtureRecoveries=0;window.fixtureSession={token:'synthetic-only',expires:new Date(Date.now()+60000).toISOString(),recovery:{deadline:new Date(Date.now()+86400000).toISOString()},user:{id:'fixture',email:'fixture@example.invalid'}};
window.fixtureStatus=async()=>({expires:window.fixtureSession.expires,recovery:window.fixtureSession.recovery});window.fixtureRecovery=async()=>({success:true});
${extra}
createRoot(document.getElementById('root')).render(React.createElement(MobileRecoveryBoundary,null,React.createElement('button',null,'Ordinary app navigation')));`;

test("native recovery host blocks ordinary navigation, requires explicit Keep account and requires a new sign-in after success", async () => {
  await withComponentBrowser(bundle(), setup(), async page => {
    const keep = page.getByRole("button", { name: "Keep account", exact: true }); await keep.waitFor();
    await page.waitForFunction(() => !(document.querySelector('button') as HTMLButtonElement)?.disabled);
    assert.equal(await page.getByRole("button", { name: "Ordinary app navigation" }).count(), 0);
    assert.equal(await page.locator('[data-safe-area="true"]').count(), 1);
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureSplashHidden: boolean }).fixtureSplashHidden), true);
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureRecoveries: number }).fixtureRecoveries), 0);
    await keep.press("Enter"); await page.getByRole("heading", { name: "Account recovered" }).waitFor();
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureRecoveries: number }).fixtureRecoveries), 1);
    assert.equal(await page.getByRole("button", { name: "Ordinary app navigation" }).count(), 0);
    await page.getByRole("button", { name: "Sign in to continue" }).click();
    await page.waitForFunction(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation.includes("/email-auth"));
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureSession: unknown }).fixtureSession), null);
  }, 375);
});

test("native recovery host retains explicit error/retry and disables duplicate submission", async () => {
  await withComponentBrowser(bundle(), setup("window.fixtureRecovery=()=>new Promise((resolve,reject)=>{window.fixtureReject=reject;});"), async page => {
    const keep = page.getByRole("button", { name: "Keep account", exact: true });
    await page.waitForFunction(() => document.querySelector('button') && !(document.querySelector('button') as HTMLButtonElement).disabled);
    await keep.click(); await page.getByRole("button", { name: "Recovering…", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Return to sign-in" }).isDisabled(), true);
    await page.evaluate(() => (window as unknown as { fixtureReject: (error: Error) => void }).fixtureReject(new Error("fixture-network-error")));
    await page.getByRole("alert").waitFor(); assert.equal(await keep.isDisabled(), false);
    assert.equal(await page.getByRole("button", { name: "Ordinary app navigation" }).count(), 0);
  });
});

test("native recovery expiry cannot be undone by a late successful status response", async () => {
  await withComponentBrowser(bundle(), setup("window.fixtureSession.expires=new Date(Date.now()+50).toISOString();window.fixtureStatus=()=>new Promise(resolve=>{window.fixtureResolveStatus=()=>resolve({expires:window.fixtureSession.expires,recovery:window.fixtureSession.recovery});});"), async page => {
    await page.getByRole("alert").waitFor();
    await page.evaluate(() => (window as unknown as { fixtureResolveStatus: () => void }).fixtureResolveStatus());
    assert.equal(await page.getByRole("button", { name: "Keep account", exact: true }).isDisabled(), true);
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureRecoveries: number }).fixtureRecoveries), 0);
    await page.getByRole("button", { name: "Return to sign-in" }).click();
    await page.waitForFunction(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation.includes("/email-auth"));
  });
});

test("ordinary ACTIVE sessions retain their existing navigation", async () => {
  await withComponentBrowser(bundle(), setup("delete window.fixtureSession.recovery;window.fixtureStatus=()=>{throw Error('Ordinary session must not enter recovery');};"), async page => {
    await page.getByRole("button", { name: "Ordinary app navigation" }).waitFor();
    assert.equal(await page.getByRole("heading", { name: "Account recovery only" }).count(), 0);
  });
});
