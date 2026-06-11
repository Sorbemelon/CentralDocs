import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const {
  DOCUMENT_SCOPE,
  DOCUMENT_SCOPES,
  DOCUMENT_STATUS,
  DOCUMENT_STATUSES,
  FILE_KIND,
  FILE_KINDS,
  SOURCE_TYPE,
  SOURCE_TYPES,
  STORAGE_PROVIDER,
} = await import("../src/constants/document.constants.js");
const { LIFECYCLE_STATUS } = await import("../src/constants/lifecycle.constants.js");
const { Document } = await import("../src/models/Document.model.js");

function hasIndex(schema, expectedFields) {
  return schema.indexes().some(([fields]) => JSON.stringify(fields) === JSON.stringify(expectedFields));
}

function baseDocument(overrides = {}) {
  return new Document({
    demoSessionId: "demo_123",
    scope: DOCUMENT_SCOPE.USER,
    sourceType: SOURCE_TYPE.UPLOAD,
    title: "Uploaded Policy",
    originalFilename: "policy.pdf",
    downloadFilename: "policy.pdf",
    fileExtension: "pdf",
    mimeType: "application/pdf",
    fileKind: FILE_KIND.PDF,
    objectKey: "demo-sessions/demo_123/uploads/doc_1/policy.pdf",
    sizeBytes: 1024,
    ...overrides,
  });
}

test("Document schema has required paths, enums, defaults, and indexes", () => {
  assert.equal(Document.schema.path("title").isRequired, true);
  assert.equal(Document.schema.path("objectKey").isRequired, true);
  assert.equal(Document.schema.path("mockId").instance, "String");
  assert.equal(Document.schema.path("folderMockId").instance, "String");
  assert.equal(Document.schema.path("manifestPath").instance, "String");
  assert.equal(Document.schema.path("description").instance, "String");
  assert.equal(Document.schema.path("demoQuestions").instance, "Array");
  assert.equal(Document.schema.path("generatedMeta.sourceDocumentIds").instance, "Array");
  assert.deepEqual(Document.schema.path("scope").enumValues, DOCUMENT_SCOPES);
  assert.deepEqual(Document.schema.path("sourceType").enumValues, SOURCE_TYPES);
  assert.deepEqual(Document.schema.path("status").enumValues, DOCUMENT_STATUSES);
  assert.deepEqual(Document.schema.path("fileKind").enumValues, FILE_KINDS);

  const document = baseDocument();
  assert.equal(document.status, DOCUMENT_STATUS.UPLOADED);
  assert.equal(document.storageProvider, STORAGE_PROVIDER.S3);
  assert.equal(document.lifecycleStatus, LIFECYCLE_STATUS.ACTIVE);
  assert.equal(document.contentStats.extractedCharCount, 0);
  assert.equal(document.contentStats.optimizedCharCount, 0);
  assert.equal(document.contentStats.estimatedTokenCount, 0);
  assert.equal(document.contentStats.chunkCount, 0);
  assert.equal(document.validateSync(), undefined);

  assert.equal(hasIndex(Document.schema, { demoSessionId: 1, lifecycleStatus: 1 }), true);
  assert.equal(hasIndex(Document.schema, { folderId: 1, lifecycleStatus: 1 }), true);
  assert.equal(hasIndex(Document.schema, { scope: 1, lifecycleStatus: 1 }), true);
  assert.equal(hasIndex(Document.schema, { sourceType: 1, lifecycleStatus: 1 }), true);
  assert.equal(hasIndex(Document.schema, { status: 1 }), true);
  assert.equal(hasIndex(Document.schema, { fileKind: 1 }), true);
  assert.equal(hasIndex(Document.schema, { createdAt: -1 }), true);
  assert.equal(hasIndex(Document.schema, { mockId: 1, scope: 1 }), true);
  assert.equal(hasIndex(Document.schema, { folderMockId: 1 }), true);
});

test("Document generated and media metadata fields exist", () => {
  const sourceMessageId = new mongoose.Types.ObjectId();
  const sourceDocumentId = "mock_doc_1";
  const transcriptDocumentId = new mongoose.Types.ObjectId();
  const directMultimodalChunkId = new mongoose.Types.ObjectId();
  const directMultimodalEmbeddedAt = new Date("2026-06-09T00:00:00.000Z");

  const generatedDocument = baseDocument({
    scope: DOCUMENT_SCOPE.GENERATED,
    sourceType: SOURCE_TYPE.GENERATED,
    title: "Generated Brief",
    originalFilename: "brief.md",
    downloadFilename: "brief.md",
    fileExtension: "md",
    mimeType: "text/markdown",
    fileKind: FILE_KIND.MARKDOWN,
    generatedMeta: {
      fromChatSessionId: new mongoose.Types.ObjectId(),
      generationInstruction: "Summarize the rollout risks.",
      sourceMessageIds: [sourceMessageId],
      sourceDocumentIds: [sourceDocumentId],
      referencesIncluded: true,
    },
    mediaMeta: {
      directMultimodalEmbeddingSeeded: true,
      directMultimodalEmbeddedAt,
      directMultimodalChunkId,
      directMultimodalEmbeddingModel: "gemini-embedding-2",
      directMultimodalEmbeddingDimensions: 768,
      transcriptDocumentId,
      durationSeconds: 42,
    },
  });

  assert.equal(generatedDocument.generatedMeta.generationInstruction, "Summarize the rollout risks.");
  assert.equal(generatedDocument.generatedMeta.referencesIncluded, true);
  assert.deepEqual(generatedDocument.generatedMeta.sourceDocumentIds, ["mock_doc_1"]);
  assert.equal(generatedDocument.mediaMeta.directMultimodalEmbeddingSeeded, true);
  assert.equal(String(generatedDocument.mediaMeta.directMultimodalChunkId), String(directMultimodalChunkId));
  assert.equal(
    generatedDocument.mediaMeta.directMultimodalEmbeddedAt.toISOString(),
    directMultimodalEmbeddedAt.toISOString(),
  );
  assert.equal(generatedDocument.mediaMeta.directMultimodalEmbeddingModel, "gemini-embedding-2");
  assert.equal(generatedDocument.mediaMeta.directMultimodalEmbeddingDimensions, 768);
  assert.equal(String(generatedDocument.mediaMeta.transcriptDocumentId), String(transcriptDocumentId));
  assert.equal(generatedDocument.validateSync(), undefined);
});

test("Document contentStats can represent indexed chunk count", () => {
  const indexedDocument = baseDocument({
    status: DOCUMENT_STATUS.READY,
    contentStats: {
      extractedCharCount: 1200,
      optimizedCharCount: 900,
      estimatedTokenCount: 225,
      chunkCount: 3,
    },
  });

  assert.equal(indexedDocument.validateSync(), undefined);
  assert.equal(indexedDocument.contentStats.chunkCount, 3);
  assert.equal(indexedDocument.contentStats.estimatedTokenCount, 225);
});

test("Document enforces session-owned records and mock read-only convention", async () => {
  const uploadedWithoutSession = baseDocument({ demoSessionId: null });
  const uploadError = uploadedWithoutSession.validateSync();
  assert.match(uploadError.errors.demoSessionId.message, /demo session/i);

  const mockDocument = baseDocument({
    demoSessionId: null,
    scope: DOCUMENT_SCOPE.MOCK,
    sourceType: SOURCE_TYPE.MOCK,
    readOnly: false,
  });

  await mockDocument.validate();
  assert.equal(mockDocument.readOnly, true);
});
