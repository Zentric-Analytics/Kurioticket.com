import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

const web = readFileSync(
  new URL("../CarDetailsClient.tsx", import.meta.url),
  "utf8",
);
const hero = readFileSync(
  new URL("./CarDetailsHero.tsx", import.meta.url),
  "utf8",
);
const nav = readFileSync(
  new URL("./CarDetailsSectionNav.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("../../../app/globals.css", import.meta.url),
  "utf8",
);
const native = readFileSync(
  new URL(
    "../../../../apps/mobile/src/features/search/ApprovedCarDetailScreen.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("Cars mobile web locks Safari to the authored native typography scale", () => {
  assert.match(
    css,
    /@media \(max-width: 1023px\)[\s\S]*?\[data-car-details-experience\][\s\S]*?-webkit-text-size-adjust: 100%;[\s\S]*?text-size-adjust: 100%;/,
  );
  assert.match(
    web,
    /font-sans \[--car-details-mobile-header-boundary:/,
  );
});

test("Cars mobile web hero typography matches the native Inter hierarchy", () => {
  assert.match(
    native,
    /title:\{fontSize:22,lineHeight:28,fontWeight:"800",fontFamily:appFonts\.extraBold,letterSpacing:-\.5\}/,
  );
  assert.match(
    web,
    /text-\[22px\] font-extrabold leading-7 tracking-\[-0\.5px\] text-\[#071A48\]/,
  );

  assert.match(
    native,
    /orSimilar:\{fontSize:14,lineHeight:20,fontWeight:"600",fontFamily:appFonts\.semibold,letterSpacing:0\}/,
  );
  assert.match(
    web,
    /text-sm font-semibold leading-5 tracking-normal text-\[#56658E\]/,
  );

  assert.match(
    native,
    /category:\{marginTop:3,fontSize:10,lineHeight:14,fontWeight:"700",fontFamily:appFonts\.bold,textTransform:"uppercase",letterSpacing:1\.4,color:"#075EE8"\}/,
  );
  assert.match(
    web,
    /text-\[10px\] font-bold uppercase leading-\[14px\] tracking-\[\.14em\] text-\[#075EE8\]/,
  );

  assert.match(
    native,
    /specText:\{flex:1,fontSize:12,lineHeight:18,fontWeight:"600",fontFamily:appFonts\.semibold\}/,
  );
  assert.match(
    hero,
    /text-xs font-semibold leading-\[18px\] text-slate-700/,
  );
});

test("Cars mobile tabs use the same static Inter 600 face as native", () => {
  assert.match(native, /tabText:\{fontWeight:"600",fontFamily:appFonts\.semibold\}/);
  assert.match(nav, /car-details-native-tab-label/);
  assert.doesNotMatch(nav, /\[-webkit-text-size-adjust:none\]|\[text-size-adjust:none\]/);
  assert.match(
    css,
    /font-family: "Kurioticket Inter Native Semibold";[\s\S]*?Inter_600SemiBold\.ttf[\s\S]*?font-weight: 600;/,
  );
  assert.match(
    css,
    /\.car-details-native-tab-label \{[\s\S]*?font-family:[\s\S]*?"Kurioticket Inter Native Semibold"[\s\S]*?font-weight: 600;[\s\S]*?font-synthesis: none;/,
  );
  assert.equal(
    statSync(
      new URL(
        "../../../../public/brand/fonts/inter/Inter_600SemiBold.ttf",
        import.meta.url,
      ),
    ).size,
    343632,
  );
});

test("Cars mobile web keeps the main tabs while hiding redundant panel headings", () => {
  assert.match(
    native,
    /tabText:\{fontWeight:"600",fontFamily:appFonts\.semibold\}/,
  );
  assert.match(
    nav,
    /font-sans text-\[12px\] font-semibold leading-\[normal\] tracking-normal[\s\S]*?min-\[390px\]:text-\[13px\]/,
  );
  assert.match(nav, /text-\[#075EE8\] lg:text-blue/);
  assert.match(nav, /text-\[#475569\] lg:hover:text-slate-950/);
  assert.match(nav, /bg-\[#075EE8\][^"]*lg:bg-blue/);

  assert.match(
    native,
    /compareHeading:\{fontSize:12,lineHeight:18,fontWeight:"700",fontFamily:appFonts\.bold,letterSpacing:-\.2\}/,
  );
  assert.match(
    web,
    /hidden text-xs font-bold leading-\[18px\] tracking-\[-0\.2px\] text-slate-950 lg:block/,
  );

  assert.match(
    native,
    /stay:\{marginTop:4,fontSize:11,lineHeight:16,fontWeight:"500",fontFamily:appFonts\.medium\}/,
  );
  assert.match(
    web,
    /mt-1 text-\[11px\] font-medium leading-4 text-slate-600/,
  );

  assert.match(
    native,
    /benefitText:\{fontSize:10\.5,lineHeight:15,fontWeight:"600",fontFamily:appFonts\.semibold\}/,
  );
  assert.match(
    web,
    /text-\[10\.5px\] font-semibold leading-\[15px\] text-slate-700/,
  );

  assert.match(
    native,
    /daily:\{maxWidth:"100%",fontSize:19,lineHeight:22,fontWeight:"600",fontFamily:appFonts\.semibold,letterSpacing:-0\.25/,
  );
  assert.match(
    web,
    /text-\[19px\] font-semibold leading-\[22px\] tracking-\[-0\.015em\] text-\[#071A48\]/,
  );

  assert.match(
    native,
    /perDay:\{fontSize:10,lineHeight:13,fontWeight:"500",fontFamily:appFonts\.medium,color:"#075EE8"/,
  );
  assert.match(
    web,
    /text-\[10px\] font-medium leading-\[13px\] text-\[#075EE8\]/,
  );
});

test("Cars mobile web Pickup and return text and copy match native", () => {
  assert.match(
    native,
    /pickupHeading:\{fontSize:12,lineHeight:18,fontWeight:"700",fontFamily:appFonts\.bold,letterSpacing:-\.2\}/,
  );
  assert.match(
    web,
    /hidden text-xs font-bold leading-\[18px\] tracking-\[-0\.2px\] text-\[#020617\] lg:block/,
  );

  assert.match(
    native,
    /timelineHeading:\{fontSize:15,lineHeight:22,fontWeight:"700",fontFamily:appFonts\.bold\}/,
  );
  assert.match(
    web,
    /text-\[15px\] font-bold leading-\[22px\] text-\[#071A48\]/,
  );

  assert.match(
    native,
    /timelineLocation:\{fontSize:14,lineHeight:20,fontWeight:"500",fontFamily:appFonts\.medium\}/,
  );
  assert.match(
    web,
    /text-\[14px\] font-medium leading-5 text-\[#071A48\]/,
  );

  assert.match(
    native,
    /timelineDate:\{fontSize:13,lineHeight:20,fontWeight:"400",fontFamily:appFonts\.regular\}/,
  );
  assert.match(
    web,
    /text-\[13px\] font-normal leading-5 text-\[#56658E\]/,
  );

  assert.match(web, /\["Pick-up",[\s\S]*?copy\("carDetails\.pickup"\)/);
  assert.match(
    web,
    /mt-4 hidden text-sm font-medium leading-5 lg:block/,
  );
  assert.match(
    web,
    /mt-2 hidden text-sm font-normal leading-5 lg:block/,
  );

  assert.match(
    native,
    /requirementsHeading:\{fontSize:14,lineHeight:20,fontWeight:"700",fontFamily:appFonts\.bold\}/,
  );
  assert.match(
    native,
    /requirementText:\{flex:1,minWidth:0,fontSize:14,lineHeight:20,fontWeight:"500",fontFamily:appFonts\.medium\}/,
  );
  assert.match(
    web,
    /text-\[14px\] font-bold leading-5 text-\[#071A48\]/,
  );
  assert.match(
    web,
    /text-\[14px\] font-medium leading-5 text-\[#071A48\]/,
  );
});

test("Cars mobile web Location and booking-dock text match native", () => {
  assert.match(
    native,
    /locationHeading:\{fontSize:12,lineHeight:18,fontWeight:"700",fontFamily:appFonts\.bold,letterSpacing:-\.2\}/,
  );
  assert.match(
    web,
    /hidden text-xs font-bold leading-\[18px\] tracking-\[-0\.2px\] text-slate-950 lg:block/,
  );

  assert.match(
    native,
    /locationPrimary:\{fontSize:13,lineHeight:20,fontWeight:"600",fontFamily:appFonts\.semibold\}/,
  );
  assert.match(
    web,
    /text-\[13px\] font-semibold leading-5 text-slate-800/,
  );

  assert.match(
    native,
    /locationSecondary:\{fontSize:12,lineHeight:20\}/,
  );
  assert.match(web, /text-xs leading-5 text-slate-500/);

  assert.match(
    native,
    /detailsHeading:\{marginTop:24,fontSize:14,lineHeight:20,fontWeight:"700",fontFamily:appFonts\.bold\}/,
  );
  assert.match(
    web,
    /text-\[14px\] font-bold leading-5 text-\[#071A48\]/,
  );

  assert.match(
    native,
    /bulletText:\{flex:1,fontSize:14,lineHeight:20,fontWeight:"400",fontFamily:appFonts\.regular\}/,
  );
  assert.match(
    web,
    /text-\[14px\] font-normal leading-5 text-\[#334155\]/,
  );

  assert.match(
    native,
    /dockTotal:\{maxWidth:"100%",fontSize:19,lineHeight:22,fontWeight:"600",fontFamily:appFonts\.semibold,letterSpacing:-0\.25/,
  );
  assert.match(
    web,
    /text-\[19px\] font-semibold leading-\[22px\] tracking-\[-0\.25px\] text-\[#071A48\]/,
  );

  assert.match(
    native,
    /dockEyebrow:\{flexShrink:1,minWidth:0,fontSize:11,lineHeight:16,fontWeight:"600",fontFamily:appFonts\.semibold\}/,
  );
  assert.match(
    web,
    /text-\[11px\] font-semibold leading-4 text-\[#56658E\]/,
  );
  assert.match(web, />\s*Estimated rental total\s*</);
});
