import { test } from "node:test";
import assert from "node:assert/strict";

const {
  buildClearSessionPlan,
  cleanupDemoSessionData,
} = await import("../src/services/demo/demoCleanup.service.js");

test("cleanup service builds deletion plan for only current demoSessionId", () => {
  const plan = buildClearSessionPlan("demo_cleanup");

  assert.equal(plan.demoSessionId, "demo_cleanup");
  assert.equal(plan.mongo.filters.Document.demoSessionId, "demo_cleanup");
  assert.equal(plan.mongo.filters.DocumentChunk.demoSessionId, "demo_cleanup");
  assert.equal(plan.mongo.filters.Folder.demoSessionId, "demo_cleanup");
  assert.equal("DemoQuotaWindow" in plan.mongo.filters, false);
  assert.equal(plan.s3.prefix, "demo-sessions/demo_cleanup/");
  assert.equal(plan.s3.prefix.includes("/generated/"), false);
  assert.ok(plan.preserves.includes("backend/mock-data"));
  assert.ok(plan.s3.preservedPrefixes.includes("mock/"));
});

test("cleanup service deletes session-created resources through mocked dependencies", async () => {
  const calls = [];
  const result = await cleanupDemoSessionData("demo_cleanup", {
    repository: {
      updateCleanupStatus: async (sessionId, status) => calls.push(["status", sessionId, status]),
      deleteSessionUserData: async (sessionId) => {
        calls.push(["deleteSessionUserData", sessionId]);
        return {
          status: "completed",
          deleted: {
            documents: 2,
            folders: 1,
            documentChunks: 4,
            chatSessions: 1,
            chatMessages: 3,
            usageEvents: 2,
            aiRoutingAttempts: 1,
          },
        };
      },
    },
    storage: {
      deleteObjectsByPrefix: async ({ prefix }) => {
        calls.push(["deleteObjectsByPrefix", prefix]);
        return { status: "completed", prefix, deletedCount: 5 };
      },
    },
    persistenceAvailable: true,
  });

  assert.equal(result.mongo.status, "completed");
  assert.equal(result.s3.status, "completed");
  assert.equal(result.s3.prefix, "demo-sessions/demo_cleanup/");
  assert.deepEqual(calls[1], ["deleteSessionUserData", "demo_cleanup"]);
  assert.ok(!result.s3.prefix.startsWith("mock/"));
});

test("cleanup service returns skipped statuses when persistence/storage are unavailable", async () => {
  const result = await cleanupDemoSessionData("demo_cleanup", {
    storage: {
      deleteObjectsByPrefix: async ({ prefix }) => ({
        status: "skipped_not_configured",
        prefix,
        deletedCount: 0,
      }),
    },
    persistenceAvailable: false,
  });

  assert.equal(result.mongo.status, "skipped_not_configured");
  assert.equal(result.s3.status, "skipped_not_configured");
});
