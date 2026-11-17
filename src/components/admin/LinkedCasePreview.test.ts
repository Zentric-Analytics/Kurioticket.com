import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { LinkedCasePreview } from "./LinkedCasePreview";

const supportPage = readFileSync("src/app/admin/support/[id]/page.tsx", "utf8");
const deletionPage = readFileSync("src/app/admin/account-deletions/[id]/page.tsx", "utf8");
const client = readFileSync("src/components/admin/LinkedCasePreview.tsx", "utf8");
const service = readFileSync("src/services/adminLinkedCasePreviewService.ts", "utf8");
const core = readFileSync("src/services/adminLinkedCasePreviewCore.ts", "utf8");
const route = readFileSync("src/app/api/admin/linked-cases/[origin]/[id]/route.ts", "utf8");

test("both related-case links render as accessible collapsed inline previews", () => {
  for (const origin of ["support", "deletion"] as const) {
    const html = renderToStaticMarkup(createElement(LinkedCasePreview, {
      origin, sourceId: "case_123456",
    }));
    assert.match(html, /aria-expanded="false"/);
    assert.match(html, /aria-controls=/);
    assert.match(html, /hidden=""/);
    assert.match(html, origin === "support" ? /View deletion request/ : /View Support ticket/);
    assert.doesNotMatch(html, /href="\/admin\/(?:account-deletions|support)\//);
    assert.doesNotMatch(html, /Loading related case/);
  }
});

test("Support and deletion pages keep existing forms while showing linked records in place", () => {
  assert.match(supportPage, /<LinkedCasePreview origin="support" sourceId=\{ticket\.id\}/);
  assert.match(supportPage, /ticket\.deletionRequestId \? \(/);
  assert.match(supportPage, /<SupportReplyForm ticketId=\{ticket\.id\}/);
  assert.match(supportPage, /<SupportTicketStatusControl ticketId=\{ticket\.id\}/);
  assert.match(deletionPage, /<LinkedCasePreview origin="deletion" sourceId=\{request\.id\}/);
  assert.match(deletionPage, /request\.supportTicketId \? \(/);
  assert.match(deletionPage, /<AccountDeletionManageForm/);
  assert.doesNotMatch(supportPage, /href=\{supportDeletionRequestHref/);
  assert.doesNotMatch(deletionPage, /href=\{supportTicketFromDeletionHref/);
});

test("client requests only independently authorized, no-store related-case reads", () => {
  assert.match(client, /fetch\(/);
  assert.match(client, /\/api\/admin\/linked-cases\//);
  assert.match(client, /credentials: "include", cache: "no-store"/);
  assert.match(client, /Read-only summary of the verified linked case/);
  assert.match(client, /The ticket conversation and Support reply controls remain in Support/);
  assert.match(client, /Management and finalization controls are not available here/);
  assert.doesNotMatch(client, /\/api\/admin\/account-deletions\/|\/api\/admin\/support\/|router\.push|router\.replace/);
  assert.match(service, /requireAdminApiSession\(\)/);
  assert.match(route, /readAdminLinkedCasePreview\(origin, id\)/);
  assert.match(route, /Cache-Control": "private, no-store"/);
  assert.match(core, /if \(!\(await authorize\(\)\)\)/);
  assert.doesNotMatch(core, /reviewNotes: true|messages: \{ select: \{ body/);
});
