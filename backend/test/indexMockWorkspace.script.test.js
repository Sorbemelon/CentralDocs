import { test } from "node:test";
import assert from "node:assert/strict";

const {
  parseIndexMockArgs,
  runIndexMockWorkspaceScript,
} = await import("../src/scripts/indexMockWorkspace.js");

test("index mock workspace script parser supports dry-run and document filter", () => {
  assert.deepEqual(
    parseIndexMockArgs(["--dry-run", "--document", "mock-document"]),
    { dryRun: true, documentIdOrSlug: "mock-document" },
  );
});

test("index mock workspace script dry-run prints safe summary", async () => {
  const logs = [];
  const errors = [];
  const result = await runIndexMockWorkspaceScript({
    argv: ["--dry-run", "--document", "doc.md"],
    connector: async () => ({ status: "not_configured" }),
    disconnect: async () => {},
    indexer: async ({ dryRun, documentIdOrSlug }) => ({
      status: "completed",
      mode: dryRun ? "dry_run" : "persistent",
      requestedDocument: documentIdOrSlug,
      indexedDocuments: 1,
      chunks: 2,
    }),
    logger: {
      log: (message) => logs.push(message),
      error: (message) => errors.push(message),
    },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(errors.length, 0);
  assert.equal(JSON.parse(logs[0]).requestedDocument, "doc.md");
  assert.equal(logs[0].includes("SECRET"), false);
  assert.equal(logs[0].includes("[0."), false);
});

test("index mock workspace script reports safe failure", async () => {
  const errors = [];
  const result = await runIndexMockWorkspaceScript({
    connector: async () => {},
    disconnect: async () => {},
    indexer: async () => {
      const error = new Error("not configured");
      error.code = "EMBEDDING_NOT_CONFIGURED";
      throw error;
    },
    logger: {
      log: () => {},
      error: (message) => errors.push(message),
    },
  });

  assert.equal(result.exitCode, 1);
  assert.equal(JSON.parse(errors[0]).code, "EMBEDDING_NOT_CONFIGURED");
});
