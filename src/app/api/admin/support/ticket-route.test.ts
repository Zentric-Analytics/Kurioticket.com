import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInThisContext } from "node:vm";
import test, { afterEach } from "node:test";
import ts from "typescript";
import * as nextServer from "next/server";
import * as admin from "@/lib/admin";
import * as validation from "@/lib/validation";
import * as supportService from "@/services/supportService";
import * as operationalReadHttp from "@/services/adminOperationalReadHttp";

// These mutation tests exercise the real route, schemas and support service.
// Its unrelated GET dependency is server-only: isolate that service here rather
// than disabling Next's server/client boundary in the standalone Node runner.
const dependencies: Record<string, unknown> = {
  "next/server": nextServer,
  "@/lib/admin": admin,
  "@/lib/validation": validation,
  "@/services/supportService": supportService,
  "@/services/adminOperationalReadHttp": operationalReadHttp,
  "@/services/adminOperationalReadService": {
    adminOperationalReads: { support: { detail: () => assert.fail("Mutation must not invoke the operational GET service") } },
  },
};
const compiled = ts.transpileModule(readFileSync("src/app/api/admin/support/[id]/route.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const routeExports = {} as typeof import("@/app/api/admin/support/[id]/route");
// Evaluate in this realm so real service objects and audit metadata keep their
// normal prototypes; only module resolution is scoped to the explicit bindings.
const loadRoute = runInThisContext(`(function(exports, require) {\n${compiled}\n})`) as (
  exports: typeof routeExports,
  require: (name: string) => unknown,
) => void;
loadRoute(routeExports, (name: string) => {
  assert.ok(Object.hasOwn(dependencies, name), "Unexpected route dependency: " + name);
  return dependencies[name];
});
const { PATCH, POST, __adminSupportTicketRouteTest } = routeExports;
const { __supportServiceTest } = supportService;

test("support mutation fixture preserves Next's server-only client-import rejection", () => {
  assert.match(readFileSync("src/services/adminOperationalReadService.ts", "utf8"), /^import "server-only";/);
  const require = createRequire(import.meta.url);
  assert.throws(() => require("next/dist/compiled/server-only"), /cannot be imported from a Client Component/);
});

const adminSession = {
  user: {
    id: "admin-1",
    email: "admin@example.com",
    role: "ADMIN",
    status: "ACTIVE",
    emailVerified: new Date("2026-07-16T00:00:00Z"),
  },
};

afterEach(() => {
  __adminSupportTicketRouteTest.setDependenciesForTesting(null);
  __supportServiceTest.setPrismaClientForTesting(null);
  __supportServiceTest.setSendSupportEmailForTesting(null);
});

function context(id = "ticket-1") {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(method: string, body: unknown) {
  return new Request(`https://kurioticket.test/api/admin/support/ticket-1`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

test("POST /api/admin/support/[id] rejects unauthorized requests", async () => {
  __adminSupportTicketRouteTest.setDependenciesForTesting({
    async requireAdmin() {
      return { response: Response.json({ error: "Admin access required." }, { status: 403 }) } as never;
    },
    async writeAuditLog() {},
  });

  const response = await POST(jsonRequest("POST", { body: "Admin reply" }), context());
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error, "Admin access required.");
});

test("POST /api/admin/support/[id] validates reply body", async () => {
  __adminSupportTicketRouteTest.setDependenciesForTesting({
    async requireAdmin() { return { session: adminSession } as never; },
    async writeAuditLog() {},
  });

  const response = await POST(jsonRequest("POST", { body: "" }), context());
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, "Reply message is required.");
});

test("POST /api/admin/support/[id] creates reply and writes audit log", async () => {
  const audits: Array<{ action: string; targetId?: string | null; metadata?: Record<string, unknown> }> = [];

  __adminSupportTicketRouteTest.setDependenciesForTesting({
    async requireAdmin() { return { session: adminSession } as never; },
    async writeAuditLog(input) { audits.push({ action: input.action, targetId: input.targetId, metadata: input.metadata }); },
  });
  __supportServiceTest.setPrismaClientForTesting({
    supportTicket: {
      async create() { throw new Error("not used"); },
      async findUnique() { return { id: "ticket-1", email: "user@example.com", subject: "Need help", status: "OPEN" }; },
      async update() { throw new Error("not used"); },
    },
    supportMessage: {
      async create(args) { return { id: "message-1", ticketId: args.data.ticketId, author: args.data.author, body: args.data.body, createdAt: new Date("2026-07-16T00:00:00Z") }; },
    },
  });
  __supportServiceTest.setSendSupportEmailForTesting(async () => ({ id: "email-1" }));

  const response = await POST(jsonRequest("POST", { body: "Admin reply" }), context());
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.message.author, "admin");
  assert.equal(audits[0].action, "support_ticket.reply");
  assert.equal(audits[0].targetId, "ticket-1");
  assert.deepEqual(audits[0].metadata, { messageId: "message-1", status: "OPEN" });
});

test("PATCH /api/admin/support/[id] updates valid status and writes audit log", async () => {
  const audits: Array<{ action: string; metadata?: Record<string, unknown> }> = [];

  __adminSupportTicketRouteTest.setDependenciesForTesting({
    async requireAdmin() { return { session: adminSession } as never; },
    async writeAuditLog(input) { audits.push({ action: input.action, metadata: input.metadata }); },
  });
  __supportServiceTest.setPrismaClientForTesting({
    supportTicket: {
      async create() { throw new Error("not used"); },
      async findUnique() { return { id: "ticket-1", email: "user@example.com", subject: "Need help", status: "OPEN" }; },
      async update(args) { return { id: args.where.id, email: "user@example.com", subject: "Need help", status: args.data.status }; },
    },
    supportMessage: {
      async create() { throw new Error("not used"); },
    },
  });

  const response = await PATCH(jsonRequest("PATCH", { status: "RESOLVED" }), context());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ticket.status, "RESOLVED");
  assert.equal(audits[0].action, "support_ticket.status_update");
  assert.deepEqual(audits[0].metadata, { previousStatus: "OPEN", nextStatus: "RESOLVED" });
});

test("PATCH /api/admin/support/[id] rejects invalid enum and missing ticket", async () => {
  __adminSupportTicketRouteTest.setDependenciesForTesting({
    async requireAdmin() { return { session: adminSession } as never; },
    async writeAuditLog() {},
  });

  const invalidStatus = await PATCH(jsonRequest("PATCH", { status: "ESCALATED" }), context());
  assert.equal(invalidStatus.status, 400);

  __supportServiceTest.setPrismaClientForTesting({
    supportTicket: {
      async create() { throw new Error("not used"); },
      async findUnique() { return null; },
      async update() { throw new Error("not used"); },
    },
    supportMessage: {
      async create() { throw new Error("not used"); },
    },
  });

  const missingTicket = await PATCH(jsonRequest("PATCH", { status: "CLOSED" }), context("missing"));
  const body = await missingTicket.json();

  assert.equal(missingTicket.status, 404);
  assert.equal(body.error, "Support ticket not found.");
});
