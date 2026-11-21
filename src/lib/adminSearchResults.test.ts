import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import ts from "typescript";
import {getAdminNavForRole} from "./adminNavigation";

test("global admin search discovers Platform Health from the real registry even when record storage is unavailable",async()=>{
 const exports:{getAdminSearchResults:(q:string)=>Promise<{pages:Array<{title:string;href:string}>;databaseUnavailable:boolean;users:unknown[]}>}={} as never;
 const modules:Record<string,unknown>={"@/lib/adminNavigation":{getAdminNavForRole},"@/lib/admin-data":{getProviderStatuses:async()=>[],formatDateTime:()=>""},"@/lib/prisma":{withOptionalDb:async()=>null},"@/lib/adminSearch":{adminSearchHistoryWhere:()=>({}),matchesAdminProvider:()=>false}};
 runInNewContext(ts.transpileModule(readFileSync("src/lib/adminSearchResults.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(id:string)=>{assert.ok(id in modules,id);return modules[id];}});
 const result=await exports.getAdminSearchResults("platform health");assert.ok(result.pages.some(page=>page.title==="Platforms"&&page.href==="/admin/platform-health"));assert.equal(result.databaseUnavailable,true);assert.deepEqual(Array.from(result.users),[]);
 assert.equal((await exports.getAdminSearchResults("")).pages.length,0);
});
