import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/flow/CarSearchPanel.tsx", "utf8");
const sheet = source.slice(source.indexOf("export function CarLocationSheet"), source.indexOf("function FieldError"));

test("Cars uses one canonical searchable picker for pickup and return", () => {
  assert.equal(source.match(/export function CarLocationSheet/g)?.length, 1);
  assert.match(source, /from "@\/lib\/cars\/carLocationSuggestions"/);
  assert.match(sheet, /searchCarLocationSuggestions\(query,\{limit:8\}\)/);
  assert.match(sheet, /mode === "return" \? "Choose return location" : "Choose pick-up location"/);
  assert.match(sheet, /onPress=\{\(\) => onChoose\(item\.value\)\}/);
});

test("Cars picker follows the native modal and keyboard contract", () => {
  assert.match(sheet, /<Modal[^>]*onRequestClose=\{onClose\}><KeyboardAvoidingView[^>]*behavior=\{Platform\.OS === "ios" \? "padding" : "height"\}><SafeAreaView edges=\{\["top","bottom"\]\}/);
  assert.match(sheet, /<Pressable style=\{\[StyleSheet\.absoluteFill,[^>]*onPress=\{onClose\}/);
  assert.match(sheet, /<View accessibilityViewIsModal/);
  assert.match(sheet, /<FlatList keyboardShouldPersistTaps="handled"/);
  assert.doesNotMatch(sheet, /autoFocus/);
  assert.match(sheet, /value=\{query\} onChangeText=\{setQuery\}/);
  assert.match(sheet, /onPress=\{\(\) => setQuery\(""\)\}/);
});

test("renderer supports every canonical Cars result kind", () => {
  assert.match(sheet, /item\.kind === "airport" \? "flight" : item\.kind === "city" \? "city" : "location"/);
  assert.match(sheet, /item\.airportCode \? `\$\{item\.secondaryText\} · \$\{item\.airportCode\}`/);
  assert.match(sheet, /onChoose\(item\.value\)/);
});

test("validation opens the first invalid location picker instead of focusing an inline input", () => {
  assert.match(source, /nextErrors\.pickupLocation\) setLocationPicker\("pickup"\); else if \(nextErrors\.dropoffLocation\) setLocationPicker\("return"\)/);
  assert.doesNotMatch(source, /pickupRef|\.focus\(\)/);
});
