import { test } from "node:test";
import assert from "node:assert/strict";

const {
  parseEmbedMockMediaArgs,
  runEmbedMockMediaScript,
} = await import("../src/scripts/embedMockMedia.js");

test("embed mock media script parser supports dry-run, force, and document filter", () => {
  assert.deepEqual(
    parseEmbedMockMediaArgs(["--dry-run", "--force", "--document", "rollout-risk-discussion.mp3"]),
    {
      dryRun: true,
      force: true,
      documentIdOrSlug: "rollout-risk-discussion.mp3",
    },
  );
});

test("embed mock media script dry-run prints safe summary", async () => {
  const logs = [];
  const errors = [];
  const result = await runEmbedMockMediaScript({
    argv: ["--dry-run", "--document", "rollout-risk-discussion.mp3"],
    connector: async () => ({ status: "not_configured" }),
    disconnect: async () => {},
    embedder: async ({ dryRun, force, documentIdOrSlug }) => ({
      status: "completed",
      mode: dryRun ? "dry_run" : "persistent",
      force,
      requestedDocument: documentIdOrSlug,
      embeddedDocuments: 0,
      planned: 1,
      results: [{
        documentId: "mock_document",
        title: "Rollout Risk Discussion",
        status: "planned",
        embeddingModel: "gemini-embedding-2",
        embeddingDimensions: 768,
      }],
    }),
    output: {
      write: (message) => logs.push(message),
      writeError: (message) => errors.push(message),
    },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(errors.length, 0);
  assert.equal(JSON.parse(logs[0]).requestedDocument, "rollout-risk-discussion.mp3");
  assert.equal(logs[0].includes("SECRET"), false);
  assert.equal(logs[0].includes("[0."), false);
  assert.equal(logs[0].includes("D:\\"), false);
});

test("embed mock media script passes force flag", async () => {
  let captured = null;
  await runEmbedMockMediaScript({
    argv: ["--force"],
    connector: async () => {},
    disconnect: async () => {},
    embedder: async (args) => {
      captured = args;
      return { status: "completed" };
    },
    output: {
      write: () => {},
      writeError: () => {},
    },
  });

  assert.equal(captured.force, true);
});

test("embed mock media script reports safe failure", async () => {
  const errors = [];
  const result = await runEmbedMockMediaScript({
    connector: async () => {},
    disconnect: async () => {},
    embedder: async () => {
      const error = new Error("bad key SECRET_TOKEN");
      error.code = "MEDIA_EMBEDDING_PROVIDER_ERROR";
      throw error;
    },
    output: {
      write: () => {},
      writeError: (message) => errors.push(message),
    },
  });

  assert.equal(result.exitCode, 1);
  assert.equal(JSON.parse(errors[0]).code, "MEDIA_EMBEDDING_PROVIDER_ERROR");
  assert.equal(errors[0].includes("SECRET_TOKEN"), false);
});
