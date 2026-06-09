import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const {
  embedAllMockMediaDocuments,
  embedMockMediaDocument,
} = await import("../src/services/mediaEmbedding/mockMediaEmbedding.service.js");
const { createMemoryDocumentChunkRepository } = await import("../src/services/indexing/documentChunk.repository.js");
const { loadMockManifest } = await import("../src/services/mockData/mockManifest.service.js");
const { toMockDocumentId, toMockFolderId } = await import("../src/utils/ids.js");

function fakeVector(value = 0.1) {
  return Array.from({ length: 768 }, () => value);
}

function toSlug(document) {
  return `${document.folderSlug}/${document.filename}`;
}

function persistentDocumentFromManifest(document, overrides = {}) {
  const slug = toSlug(document);
  return {
    _id: new mongoose.Types.ObjectId(),
    id: toMockDocumentId(slug),
    mockId: toMockDocumentId(slug),
    folderId: toMockFolderId(document.folderSlug),
    scope: "mock",
    sourceType: "mock",
    readOnly: true,
    lifecycleStatus: "active",
    fileKind: document.fileKind,
    title: document.title,
    originalFilename: document.filename,
    mimeType: document.mimeType,
    mediaMeta: {
      directMultimodalEmbeddingSeeded: false,
    },
    ...overrides,
  };
}

function fakeRepositories({ documentsByMockId = new Map(), chunkRepository = createMemoryDocumentChunkRepository() } = {}) {
  const mediaMetaUpdates = [];
  return {
    mediaMetaUpdates,
    chunkRepository,
    documentRepository: {
      findPersistentMockDocumentByMockId: async (mockId) => documentsByMockId.get(mockId) || null,
      updateDocumentMediaMeta: async (call) => {
        mediaMetaUpdates.push(call);
        return call;
      },
    },
  };
}

test("mock media embedding service dry-run validates media without persistence or embedding call", async () => {
  let embedderCalled = false;
  const result = await embedMockMediaDocument({
    slug: "01-strategy-rollout/intake-to-ai-search-workflow.png",
    dryRun: true,
    embedder: async () => {
      embedderCalled = true;
    },
  });

  assert.equal(result.status, "planned");
  assert.equal(result.dryRun, true);
  assert.equal(result.fileKind, "image");
  assert.equal(embedderCalled, false);
});

test("mock media embedding service embeds one image through fake repositories", async () => {
  const manifest = await loadMockManifest();
  const manifestDocument = manifest.documents.find((document) => document.fileKind === "image");
  const persistentDocument = persistentDocumentFromManifest(manifestDocument);
  const repositories = fakeRepositories({
    documentsByMockId: new Map([[persistentDocument.mockId, persistentDocument]]),
  });

  const result = await embedMockMediaDocument({
    slug: toSlug(manifestDocument),
    embedder: async () => ({
      model: "gemini-embedding-2",
      dimensions: 768,
      embedding: fakeVector(0.2),
      provider: "gemini",
      inputType: "image",
      mimeType: manifestDocument.mimeType,
    }),
    repositories,
  });

  const chunks = await repositories.chunkRepository.listChunksForDocument({
    documentId: persistentDocument._id,
  });

  assert.equal(result.status, "completed");
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].chunkKind, "media_direct");
  assert.equal(repositories.mediaMetaUpdates.length, 1);
});

test("mock media embedding service embeds audio and video through fake repositories", async () => {
  const manifest = await loadMockManifest();
  const mediaDocuments = manifest.documents.filter((document) => ["audio", "video"].includes(document.fileKind));
  const documentsByMockId = new Map();
  for (const manifestDocument of mediaDocuments) {
    const persistentDocument = persistentDocumentFromManifest(manifestDocument);
    documentsByMockId.set(persistentDocument.mockId, persistentDocument);
  }
  const repositories = fakeRepositories({ documentsByMockId });

  for (const manifestDocument of mediaDocuments) {
    const result = await embedMockMediaDocument({
      slug: toSlug(manifestDocument),
      embedder: async () => ({
        model: "gemini-embedding-2",
        dimensions: 768,
        embedding: fakeVector(0.3),
        provider: "gemini",
        inputType: manifestDocument.fileKind,
        mimeType: manifestDocument.mimeType,
      }),
      repositories,
    });

    assert.equal(result.status, "completed");
    assert.equal(result.inputType, manifestDocument.fileKind);
  }
});

test("mock media embedding service returns skipped_cached for an existing direct media chunk", async () => {
  const manifest = await loadMockManifest();
  const manifestDocument = manifest.documents.find((document) => document.fileKind === "image");
  const persistentDocument = persistentDocumentFromManifest(manifestDocument);
  const chunkRepository = createMemoryDocumentChunkRepository();
  await chunkRepository.insertChunksForDocument({
    chunks: [{
      id: "cached_direct_chunk",
      documentId: persistentDocument._id,
      chunkKind: "media_direct",
      chunkIndex: 100000,
      content: "cached media",
      lifecycleStatus: "active",
    }],
  });
  const repositories = fakeRepositories({
    documentsByMockId: new Map([[persistentDocument.mockId, persistentDocument]]),
    chunkRepository,
  });

  const result = await embedMockMediaDocument({
    slug: toSlug(manifestDocument),
    repositories,
    embedder: async () => {
      throw new Error("should not run fake embedder");
    },
  });

  assert.equal(result.status, "skipped_cached");
  assert.equal(result.cached, true);
});

test("mock media embedding service dry-run can plan all controlled mock media documents", async () => {
  const summary = await embedAllMockMediaDocuments({ dryRun: true });

  assert.equal(summary.status, "completed");
  assert.equal(summary.mode, "dry_run");
  assert.equal(summary.mediaDocumentsSelected, 3);
  assert.equal(summary.planned, 3);
  assert.equal(summary.failures.length, 0);
});

test("mock media embedding service reports missing and non-media documents safely", async () => {
  await assert.rejects(
    () => embedMockMediaDocument({ slug: "missing/media.png", dryRun: true }),
    { code: "MOCK_DOCUMENT_NOT_FOUND" },
  );
  await assert.rejects(
    () => embedMockMediaDocument({ slug: "02-document-operations/document-management-policy.pdf", dryRun: true }),
    { code: "MEDIA_EMBEDDING_UNSUPPORTED" },
  );
});

test("mock media embedding service persistence path is gated when MongoDB is absent", async () => {
  await assert.rejects(
    () => embedMockMediaDocument({ slug: "01-strategy-rollout/intake-to-ai-search-workflow.png" }),
    { code: "PERSISTENCE_NOT_CONFIGURED" },
  );
});
