import assert from "node:assert/strict";
import test from "node:test";
test("Flight light roles use the approved exact palette without changing other consumers or dark mode",async()=>{
 const {flightResultsColors:c,resolveFlightResultsTheme}=await import("./flightResultsPresentation");
 assert.equal(c.canvas,"#F5F7FB");assert.equal(c.action,"#004BB8");assert.equal(c.primary,"#142033");assert.equal(c.headerSecondary,"#536B92");assert.equal(c.border,"#D8E1EC");assert.equal(c.filterCanvas,"#F2F4F8");assert.equal(c.alertSurface,"#EEF6FF");assert.equal(c.alertBorder,"#CFE0F8");
 const base={dark:false,background:"legacy",surface:"legacy",textPrimary:"legacy",border:"legacy"};
 assert.equal(resolveFlightResultsTheme(base,false),base);
 const dark={...base,dark:true};assert.equal(resolveFlightResultsTheme(dark,true),dark);
 const flight=resolveFlightResultsTheme(base,true);assert.equal(flight.background,c.canvas);assert.equal(flight.surface,"#FFFFFF");assert.equal(flight.textPrimary,c.primary);assert.equal(flight.border,c.border);assert.equal(base.background,"legacy");
});
test("selected quick groups are navy and white while neutral chips retain the standard border",async()=>{
 const {flightQuickFilterColors,flightResultsColors:c}=await import("./flightResultsPresentation");
 const theme={dark:false,surface:"legacy",border:"legacy",textPrimary:"legacy",textSecondary:"legacy",background:"legacy"};
 assert.deepEqual(flightQuickFilterColors(theme,true),{surface:c.primary,foreground:"#FFFFFF",border:c.primary,chevron:"#FFFFFF",count:c.primary});
 const neutral=flightQuickFilterColors(theme,false);assert.equal(neutral.surface,"#FFFFFF");assert.equal(neutral.foreground,c.primary);assert.equal(neutral.border,c.border);
});
