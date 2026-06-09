import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const {
  indexMockDocument,
  indexMockWorkspaceDocuments,
} = await import("../src/services/indexing/mockDocumentIndexing.service.js");

function fakeVector(value = 0.7) {
  return Array.from({ length: 768 }, () => value);
}

function fakeEmbedder(calls = []) {
  return async ({ text }) => {
    calls.push(text);
    return {
      model: "gemini-embedding-2",
      dimensions: 768,
      embedding: fakeVector(),
      provider: "gemini",
      keySlot: 0,
      warnings: [],
    };
  };
}

function persistentRepositories(storedChunks = []) {
  return {
    documentRepository: {
      findPersistentMockDocumentByMockId: async (mockId) => ({
        _id: new mongoose.Types.ObjectId(),
        mockId,
        demoSessionId: null,
        folderId: new mongoose.Types.ObjectId(),
        scope: "mock",
        sourceType: "mock",
        title: "Mock Document",
        fileKind: "markdown",
        status: "ready",
        lifecycleStatus: "active",
      }),
      updateDocumentIndexingStatus: async ({ patch }) => patch,
    },
    chunkRepository: {
      countChunksForDocument: async () => 0,
      replaceChunksForDocument: async ({ chunks }) => {
        storedChunks.push(...chunks);
        return { insertedCount: chunks.length, chunks };
      },
    },
  };
}

test("mock document indexing dry-run indexes a markdown mock document without DB writes", async () => {
  const calls = [];
  const result = await indexMockDocument({
    slug: "01-strategy-rollout/centraldocs-transformation-brief.md",
    embedder: fakeEmbedder(calls),
    repositories: {
      documentRepository: {
        findPersistentMockDocumentByMockId: async () => {
          throw new Error("should not read persistence in dry-run");
        },
      },
      chunkRepository: {
        replaceChunksForDocument: async () => {
          throw new Error("should not write chunks in dry-run");
        },
      },
    },
    options: { dryRun: true },
  });

  assert.ok(calls.length >= 1);
  assert.equal(result.persistence.status, "dry_run");
  assert.equal(result.status, "ready");
  assert.equal(result.chunkCount > 0, true);
});

test("mock document indexing dry-run handles CSV mock documents", async () => {
  const calls = [];
  const summary = await indexMockWorkspaceDocuments({
    documentIdOrSlug: "04-customer-support-signals/customer-feedback-export.csv",
    dryRun: true,
    embedder: fakeEmbedder(calls),
  });

  assert.equal(summary.status, "completed");
  assert.equal(summary.documentsSelected, 1);
  assert.equal(summary.indexedDocuments, 1);
  assert.ok(calls.length >= 1);
});

test("mock document indexing uses media sidecar text without direct multimodal embedding", async () => {
  const calls = [];
  const summary = await indexMockWorkspaceDocuments({
    documentIdOrSlug: "05-meeting-evidence/rollout-risk-discussion.mp3",
    dryRun: true,
    embedder: fakeEmbedder(calls),
  });

  assert.equal(summary.status, "completed");
  assert.equal(summary.indexedDocuments, 1);
  assert.ok(calls.every((value) => typeof value === "string"));
  assert.equal(JSON.stringify(summary).includes("directMultimodal"), false);
});

test("mock document indexing persistent fake repository stores chunks", async () => {
  const storedChunks = [];
  const result = await indexMockDocument({
    slug: "01-strategy-rollout/centraldocs-transformation-brief.md",
    embedder: fakeEmbedder(),
    repositories: persistentRepositories(storedChunks),
  });

  assert.equal(result.persistence.status, "completed");
  assert.equal(storedChunks.length, result.chunkCount);
  assert.equal(storedChunks[0].scope, "mock");
});

test("mock document indexing returns safe not found and persistence errors", async () => {
  await assert.rejects(
    () =>
      indexMockDocument({
        slug: "missing-document.md",
        embedder: fakeEmbedder(),
        options: { dryRun: true },
      }),
    { code: "MOCK_DOCUMENT_NOT_FOUND" },
  );

  await assert.rejects(
    () =>
      indexMockDocument({
        slug: "01-strategy-rollout/centraldocs-transformation-brief.md",
        embedder: fakeEmbedder(),
        repositories: {
          documentRepository: {
            findPersistentMockDocumentByMockId: async () => null,
          },
        },
      }),
    { code: "PERSISTENCE_NOT_CONFIGURED" },
  );
});
