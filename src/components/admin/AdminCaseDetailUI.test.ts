import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CaseDetailHeading, CaseInfoField, CaseMilestone, CaseSectionTitle, CaseSidebarField, caseColumnsClass } from "./AdminCaseDetailUI";

const support = readFileSync("src/app/admin/support/[id]/page.tsx", "utf8");
const deletion = readFileSync("src/app/admin/account-deletions/[id]/page.tsx", "utf8");
const linked = readFileSync("src/components/admin/LinkedCasePreview.tsx", "utf8");
const supportActions = readFileSync("src/components/admin/SupportTicketActions.tsx", "utf8");
const deletionActions = readFileSync("src/components/admin/AccountDeletionManageForm.tsx", "utf8");

test("both case details reuse a responsive layout while retaining original workflows", () => {
  for (const page of [support, deletion]) {
    assert.match(page, /casePageClass/);
    assert.match(page, /caseColumnsClass/);
    assert.match(page, /caseAsideClass/);
    assert.match(page, /<CaseDetailHeading/);
    assert.match(page, /LinkedCasePreview/);
    assert.doesNotMatch(page, /max-w-\[1138px\]|lg:grid-cols-\[minmax\(0,1fr\)_320px\]/);
  }
  assert.match(caseColumnsClass, /minmax\(320px,360px\)/);
  assert.match(support, /<SupportReplyForm ticketId=\{ticket\.id\}/);
  assert.match(support, /<SupportTicketStatusControl ticketId=\{ticket\.id\}/);
  assert.match(support, /<LinkedCasePreview origin="support" sourceId=\{ticket\.id\}/);
  assert.match(deletion, /<AccountDeletionManageForm/);
  assert.match(deletion, /readyForReview=\{readyForReview\}/);
  assert.match(deletion, /canFinalize=\{canFinalize\}/);
  assert.match(deletion, /<LinkedCasePreview origin="deletion" sourceId=\{request\.id\}/);
});

test("deletion timeline keeps requested and scheduled dates separate from conditional lifecycle events", () => {
  assert.match(deletion, /CaseMilestone label="Requested"/);
  assert.match(deletion, /CaseMilestone label="Scheduled review"/);
  assert.match(deletion, /request\.cancelledAt \? <CaseMilestone label="Cancelled"/);
  assert.match(deletion, /request\.completedAt \? <CaseMilestone label="Completed"/);
  assert.match(deletion, /statusView\[request\.status\]\.description/);
  assert.match(deletion, /<CaseInfoField label="Email"/);
  assert.match(deletion, /<CaseInfoField label="Request ID"/);
  assert.match(deletion, /<CaseInfoField label="User ID"/);
});

test("read-only linked previews retain independent protected loading and no management controls", () => {
  assert.match(linked, /\/api\/admin\/linked-cases\//);
  assert.match(linked, /credentials: "include", cache: "no-store"/);
  assert.match(linked, /aria-expanded=\{expanded\}/);
  assert.match(linked, /aria-busy=\{loading\}/);
  assert.match(linked, /Management and finalization controls are not available here/);
  assert.doesNotMatch(linked, /\/api\/admin\/account-deletions\/|\/api\/admin\/support\/|router\.push|router\.replace/);
});

test("critical form endpoints and delete safety gates are retained", () => {
  assert.match(supportActions, /method: "POST"/);
  assert.match(supportActions, /method: "PATCH"/);
  assert.match(supportActions, /disabled=\{isReplyPending \|\| !validReply\}/);
  assert.match(supportActions, /disabled=\{isStatusPending \|\| selectedStatus === status\}/);
  assert.match(deletionActions, /method: "PATCH"/);
  assert.match(deletionActions, /confirmEmail\.trim\(\)\.toLowerCase\(\) === accountEmail\.trim\(\)\.toLowerCase\(\)/);
  assert.match(deletionActions, /retentionReviewed/);
  assert.match(deletionActions, /disabled=\{isPending \|\| !finalizeReady\}/);
});

test("shared layout components render the expected semantic information and state", () => {
  const heading = renderToStaticMarkup(createElement(CaseDetailHeading, {title:"Account deletion request", status:"Cancelled", dot:"bg-slate-500"}));
  assert.match(heading, /<h1/);
  assert.match(heading, /Cancelled/);
  const milestone = renderToStaticMarkup(createElement("dl", null, createElement(CaseMilestone, {label:"Requested", value:"Nov 17, 2026", tone:"info"})));
  assert.match(milestone, /<dt/);
  assert.match(milestone, /<dd/);
  assert.match(milestone, /Nov 17, 2026/);
  const section = renderToStaticMarkup(CaseSectionTitle({id:"account-details", children:"Account information"}));
  assert.match(section, /id="account-details"/);
  const field = renderToStaticMarkup(createElement("dl", null, CaseInfoField({label:"Request ID", wide:true, children:"request_123"})));
  assert.match(field, /Request ID/);
  assert.match(field, /request_123/);
  const asideField = renderToStaticMarkup(createElement("dl", null, CaseSidebarField({label:"Priority", children:"Normal"})));
  assert.match(asideField, /Priority/);
  assert.match(asideField, /Normal/);
});
