import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const screen=readFileSync("src/features/search/ApprovedCarResultsScreen.tsx","utf8");
const modal=readFileSync("src/features/search/CarEditSearchModal.tsx","utf8");
const panel=readFileSync("src/features/flow/CarSearchPanel.tsx","utf8");
test("Cars Results edit opens an in-place canonical search modal",()=>{assert.ok(screen.includes("carEditSearchOpen"));assert.ok(screen.includes("const edit=()=>setCarEditSearchOpen(true)"));assert.ok(screen.includes("<CarEditSearchModal"));const edit=screen.slice(screen.indexOf("const edit"),screen.indexOf("const openDeal"));assert.doesNotMatch(edit,/router\.back|router\.replace|pathname:.*cars/);});
test("Car edit modal follows the retained native Hotel sheet architecture",()=>{for(const contract of ["Modal","KeyboardAvoidingView","SafeAreaView","onRequestClose","useSearchPickerMotion","useRetainedPickerContext","Edit car search","<CarSearchPanel","submitNavigation=\"replace\"","onBeforeNavigate={onClose}","submitLabel=\"Search\""])assert.ok(modal.includes(contract),contract);});
test("CarSearchPanel keeps push by default and closes before replace navigation",()=>{assert.ok(panel.includes('submitNavigation = "push"'));assert.ok(panel.indexOf("onBeforeNavigate?.()")<panel.indexOf("router[submitNavigation]"));});
