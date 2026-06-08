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
});

test("Document generated and media metadata fields exist", () => {
  const sourceMessageId = new mongoose.Types.ObjectId();
  const sourceDocumentId = new mongoose.Types.ObjectId();
  const transcriptDocumentId = new mongoose.Types.ObjectId();

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
      transcriptDocumentId,
      durationSeconds: 42,
    },
  });

  assert.equal(generatedDocument.generatedMeta.generationInstruction, "Summarize the rollout risks.");
  assert.equal(generatedDocument.generatedMeta.referencesIncluded, true);
  assert.equal(generatedDocument.mediaMeta.directMultimodalEmbeddingSeeded, true);
  assert.equal(String(generatedDocument.mediaMeta.transcriptDocumentId), String(transcriptDocumentId));
  assert.equal(generatedDocument.validateSync(), undefined);
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
