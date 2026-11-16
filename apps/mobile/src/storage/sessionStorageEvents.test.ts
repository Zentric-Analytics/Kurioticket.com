import assert from "node:assert/strict";import test from "node:test";import { publishSession,subscribeSession,getSessionRevision } from "./sessionEvents";
test("session writes, replacements and clears publish without polling",()=>{const users:(string|null)[]=[];const unsubscribe=subscribeSession(session=>users.push(session?.user.id||null));publishSession({token:"a",expires:"2999",user:{id:"a",email:"a@example.com"}});publishSession({token:"b",expires:"2999",user:{id:"b",email:"b@example.com"}});publishSession(null);unsubscribe();assert.deepEqual(users,["a","b",null]);});
test("session storage connects write and clear operations to the event bus",async()=>{const source=await import("node:fs").then(fs=>fs.readFileSync("src/storage/sessionStorage.ts","utf8"));assert.match(source,/writeSession[\s\S]*publishSession\(session\)/);assert.match(source,/clearSession[\s\S]*publishSession\(null\)/);});

test("session revisions include recovery-session replacement and clear without leaking after unsubscribe", () => {
  const before = getSessionRevision();
  const deadline = "2030-01-01T00:15:00.000Z";
  const received: Array<string | null> = [];
  const stop = subscribeSession(session => received.push(session?.recovery?.deadline ?? null));
  publishSession({ token: "fixture-recovery", expires: "2030-01-01T00:00:00.000Z", recovery: { deadline }, user: { id: "fixture", email: "fixture@example.test" } });
  assert.equal(getSessionRevision(), before + 1);
  publishSession(null);
  assert.equal(getSessionRevision(), before + 2);
  stop();
  publishSession(null);
  assert.equal(getSessionRevision(), before + 3);
  assert.deepEqual(received, [deadline, null]);
});
