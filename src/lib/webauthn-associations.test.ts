import assert from "node:assert/strict";
import test from "node:test";

import { appleAssociation } from "./webauthn-associations";

test("AASA uses only configured application identifiers", () => {
  assert.deepEqual(
    appleAssociation({
      WEBAUTHN_IOS_APP_IDS: "ABCDE12345.com.kurioticket.app",
    } as NodeJS.ProcessEnv),
    { webcredentials: { apps: ["ABCDE12345.com.kurioticket.app"] } },
  );
  assert.throws(() => appleAssociation({} as NodeJS.ProcessEnv));
  assert.throws(() =>
    appleAssociation({
      WEBAUTHN_IOS_APP_IDS: "com.kurioticket.app",
    } as NodeJS.ProcessEnv),
  );
});
