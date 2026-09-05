import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailSource = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const hotel = detailSource.slice(
  detailSource.indexOf("function HotelDetail"),
  detailSource.indexOf("const detailIcons"),
);
const gallery = readFileSync("src/features/search/NativeHotelDetails.tsx", "utf8");
const webIdentity = readFileSync(
  "../../src/components/results/hotelDetails/StandaloneHotelDetails.tsx",
  "utf8",
);
const webGallery = readFileSync(
  "../../src/components/results/hotelDetails/HotelDetailsGallery.tsx",
  "utf8",
);

function styleRule(source: string, name: string, nextName: string) {
  const start = source.indexOf(`  ${name}:`);
  const end = source.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return source.slice(start, end);
}

test("mobile web retains the Hotel identity and inward action reference", () => {
  assert.match(webIdentity, /text-\[22px\] font-extrabold leading-tight tracking-\[-0\.025em\]/);
  assert.match(webIdentity, /className="mt-2 space-y-1 lg:hidden"/);
  assert.match(webIdentity, /gap-1\.5 text-xs font-semibold leading-5/);
  assert.match(webIdentity, /className="h-4 w-4 shrink-0"/);
  assert.match(webIdentity, /className="flex shrink-0 gap-0 lg:gap-3"/);
  assert.match(webIdentity, /size-11 items-center justify-end[^\"]*pe-1/);
  assert.match(webIdentity, /size-11 items-center justify-start[^\"]*ps-1/);
});

test("native Hotel identity matches web typography without changing its facts", () => {
  const name = styleRule(detailSource, "hotelName", "stars");
  const fact = styleRule(detailSource, "hotelFact", "hotelClassificationStars");
  const classification = styleRule(detailSource, "hotelClassificationStars", "hotelGallery");
  const row = styleRule(detailSource, "hotelFactRow", "hotelDetailBody");

  assert.match(name, /fontSize: 22[^}]*lineHeight: 28[^}]*fontWeight: "800"[^}]*fontFamily: appFonts\.extraBold[^}]*letterSpacing: -0\.55/);
  assert.doesNotMatch(name, /fontWeight: "900"/);
  assert.match(detailSource, /hotelIdentity: \{[^}]*gap: 12/);
  assert.match(detailSource, /hotelIdentityCopy: \{ flex: 1, minWidth: 0 \}/);
  assert.match(detailSource, /hotelIdentityMeta: \{ marginTop: 8, gap: 4 \}/);
  assert.match(fact, /fontSize: 12[^}]*lineHeight: 20[^}]*fontWeight: "600"[^}]*fontFamily: appFonts\.semibold/);
  assert.match(row, /minHeight: 20[^}]*alignItems: "flex-start"[^}]*gap: 6/);
  assert.match(hotel, /<Icon accessible=\{false\} size=\{16\} color=\{theme\.icon\} \/>/);
  assert.match(hotel, /<Award accessible=\{false\} size=\{16\} color=\{theme\.icon\} \/>/);
  assert.match(classification, /color: "#F59E0B"[^}]*fontSize: 15[^}]*lineHeight: 20[^}]*letterSpacing: 1\.2[^}]*fontWeight: "400"[^}]*fontFamily: appFonts\.regular/);
  assert.match(hotel, /accessibilityLabel=\{`\$\{classification\} star hotel`\}/);
  assert.match(hotel, /\{"★"\.repeat\(classification\)\}/);
  assert.match(hotel, /\{result\.name\}/);
  assert.doesNotMatch(hotel, /numberOfLines=\{1\}[\s\S]{0,80}\{result\.name\}/);
});

test("native Save and Share move inward inside independent 44dp actions", () => {
  const group = styleRule(detailSource, "hotelHeaderActions", "hotelHeaderAction");
  const base = styleRule(detailSource, "hotelHeaderAction", "hotelHeaderActionSave");
  const save = styleRule(detailSource, "hotelHeaderActionSave", "hotelHeaderActionShare");
  const share = styleRule(detailSource, "hotelHeaderActionShare", "hotelFact");

  assert.match(group, /flexDirection: "row"[^}]*flexShrink: 0[^}]*gap: 0/);
  assert.doesNotMatch(group, /marginRight/);
  assert.match(base, /width: 44[^}]*height: 44[^}]*justifyContent: "center"/);
  assert.match(save, /alignItems: "flex-end"[^}]*paddingRight: 4/);
  assert.match(share, /alignItems: "flex-start"[^}]*paddingLeft: 4/);
  assert.match(hotel, /style=\{\[d\.hotelHeaderAction, d\.hotelHeaderActionSave\]\}/);
  assert.match(hotel, /style=\{\[d\.hotelHeaderAction, d\.hotelHeaderActionShare\]\}/);
  assert.equal((hotel.match(/<Pressable/g) ?? []).length > 1, true);
  assert.match(hotel, /<Heart[\s\S]*?size=\{20\}[\s\S]*?strokeWidth=\{2\}/);
  assert.match(hotel, /onPress=\{\(\) => void canonical\.toggleHotel\(result, params\)\}/);
  assert.match(hotel, /onPress=\{shareHotel\}/);
});

test("web and native gallery controls remain transparent and accessible", () => {
  const arrow = styleRule(gallery, "arrow", "left");
  const left = styleRule(gallery, "left", "right");
  const right = styleRule(gallery, "right", "counter");

  assert.match(webGallery, /left-0[^\"]*size-11[^\"]*justify-start[^\"]*bg-transparent[^\"]*ps-1/);
  assert.match(webGallery, /right-0[^\"]*size-11[^\"]*justify-end[^\"]*bg-transparent[^\"]*pe-1/);
  assert.match(webGallery, /ChevronLeft className="h-5 w-5"/);
  assert.match(webGallery, /ChevronRight className="h-5 w-5"/);
  assert.match(arrow, /width: 44[^}]*height: 44[^}]*backgroundColor: "transparent"/);
  assert.doesNotMatch(arrow, /rgba\(0,0,0,\.48\)|borderRadius: 22/);
  assert.match(left, /left: 0[^}]*alignItems: "flex-start"[^}]*paddingLeft: 8/);
  assert.match(right, /right: 0[^}]*alignItems: "flex-end"[^}]*paddingRight: 8/);
  assert.match(gallery, /accessibilityLabel="Previous photo"[\s\S]*?move\(-1\)[\s\S]*?<ChevronLeft color="white" size=\{20\}/);
  assert.match(gallery, /accessibilityLabel="Next photo"[\s\S]*?move\(1\)[\s\S]*?<ChevronRight color="white" size=\{20\}/);
});

test("web and native fifth thumbnails show the Images icon with the truthful count", () => {
  const remainingContent = styleRule(gallery, "remainingContent", "remainingText");
  const remainingText = styleRule(gallery, "remainingText", "unavailable");

  assert.match(webGallery, /bg-slate-950\/55 text-xs font-bold text-white/);
  assert.match(webGallery, /<Images className="mr-1 h-4 w-4"/);
  assert.match(gallery, /import \{ ChevronLeft, ChevronRight, Images, X \} from "lucide-react-native"/);
  assert.match(gallery, /images\.slice\(0, 5\)/);
  assert.match(gallery, /images\.length - 5/);
  assert.match(gallery, /<Images accessible=\{false\} size=\{16\} color="white" \/>/);
  assert.match(remainingContent, /flexDirection: "row"[^}]*alignItems: "center"[^}]*gap: 4/);
  assert.match(remainingText, /fontSize: 12[^}]*lineHeight: 16[^}]*fontWeight: "700"[^}]*fontFamily: appFonts\.bold/);
  assert.doesNotMatch(remainingText, /fontSize: 16|fontWeight: "900"/);
});
