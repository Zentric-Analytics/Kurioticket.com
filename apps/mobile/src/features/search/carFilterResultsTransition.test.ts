import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const screen=readFileSync("src/features/search/ApprovedCarResultsScreen.tsx","utf8");
const sheet=readFileSync("src/features/search/CarFilterSheet.tsx","utf8");
const copy=readFileSync("src/features/search/carFilterCopy.ts","utf8");
test("car filter feedback is immediate, localized, and timed",()=>{assert.match(sheet,/filterUpdating/);assert.match(sheet,/NATIVE_FILTER_SELECTION_FEEDBACK_MS/);assert.match(sheet,/update\(\{ \.\.\.filters, \[group\]: next \}\)/);for(const text of ["Updating filters…","Actualizando filtros…","جارٍ تحديث عوامل التصفية…"])assert.ok(copy.includes(text));});
test("car results use one cleaned-up accessible skeleton transition",()=>{for(const signal of ["carResultsApplying","carFilterSessionDirtyRef","NATIVE_FILTER_RESULTS_TRANSITION_MS","Updating car results","CarSkeletons"])assert.ok(screen.includes(signal),signal);assert.match(screen,/clearTimeout\(carResultsApplyingTimer\.current\)/);assert.match(screen,/carResultsApplying \? \([\s\S]*<CarSkeletons/);assert.match(screen,/startCarResultsTransition\(\)/);});
test("sort stays outside the local filter transition",()=>{const sort=screen.match(/onPress=\{\(\) => setSort[\s\S]{0,200}/)?.[0]??"";assert.doesNotMatch(sort,/startCarResultsTransition/);const transition=screen.slice(screen.indexOf("const startCarResultsTransition"),screen.indexOf("const filterGroups"));assert.doesNotMatch(transition,/searchCars|setStatus|setRetry|router\./);});
