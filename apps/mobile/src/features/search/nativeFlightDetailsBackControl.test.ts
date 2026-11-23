import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/NativeFlightDetails.tsx", "utf8");

const styleBody = (name: string) => {
  const match = source.match(new RegExp(`${name}:\\{([^}]*)\\}`));
  assert.ok(match, `${name} style must exist`);
  return match[1];
};

test("loaded and loading Back controls use the same isolated wrapper", () => {
  assert.match(source, /testID="flight-details-back-control" style=\{\[s\.heroBackControl,\{top:inset\.top\+8\}\]\}/);
  assert.match(source, /testID="flight-details-loading-back-control" style=\{\[s\.heroBackControl,\{top:topInset\+8\}\]\}/);
  assert.match(source, /heroBackControl:\{position:"absolute",left:16,width:44,height:44,zIndex:20\}/);
  assert.match(source, /heroIconButton:\{width:44,height:44,borderRadius:22/);
});

test("Back wrapper cannot become a full-width or flex-stretched surface", () => {
  const backWrapper = styleBody("heroBackControl");

  assert.doesNotMatch(backWrapper, /width:"100%"/);
  assert.doesNotMatch(backWrapper, /(?:^|,)flex:1(?:,|$)/);
  assert.doesNotMatch(backWrapper, /flexGrow:/);
  assert.doesNotMatch(backWrapper, /alignSelf:"stretch"/);
  assert.doesNotMatch(backWrapper, /right:/, "an absolute Back wrapper must not anchor both horizontal edges");
  assert.doesNotMatch(backWrapper, /backgroundColor:|borderRadius:/, "the wrapper must not paint a pill behind the compact glass button");
  assert.doesNotMatch(source, /heroControls:\{|floatingControls:\{/);
});

test("Back glass remains local to the compact touch target", () => {
  const glass = styleBody("heroIconGlass");
  assert.match(glass, /position:"absolute",left:2,right:2,top:2,bottom:2,borderRadius:20/);
  assert.doesNotMatch(glass, /width:"100%"|flex(?:Grow)?:1/);
});
