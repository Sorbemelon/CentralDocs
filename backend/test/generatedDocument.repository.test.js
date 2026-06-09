import { test } from "node:test";
import assert from "node:assert/strict";

const {
  buildGeneratedDocumentPayload,
  createMemoryGeneratedDocumentRepository,
} = await import("../src/services/generatedDocuments/generatedDocument.repository.js");
const { normalizeGeneratedDocumentFilename } = await import(
  "../src/services/generatedDocuments/generatedDocumentFilename.service.js"
);
const { toDocumentDto } = await import("../src/services/documents/document.dto.js");

test("generated document repository builds generated Document payload", () => {
  const payload = buildGeneratedDocumentPayload({
    documentId: "64b64b64b64b64b64b64b64b",
    demoSessionId: "demo_123",
    chatId: "64b64b64b64b64b64b64b64c",
    filenameMeta: normalizeGeneratedDocumentFilename("rollout-brief.md"),
    objectKey: "demo-sessions/demo_123/generated/64b64b64b64b64b64b64b64b/rollout-brief.md",
    sizeBytes: 20,
    content: "# Brief",
    generatedMeta: {
      generationInstruction: "Create a brief.",
      sourceMessageIds: ["64b64b64b64b64b64b64b64d"],
      sourceDocumentIds: ["mock_doc_1", "64b64b64b64b64b64b64b64e"],
      referencesIncluded: true,
    },
    expiresAt: "2026-06-12T00:00:00.000Z",
  });

  assert.equal(payload.scope, "generated");
  assert.equal(payload.sourceType, "generated");
  assert.equal(payload.lifecycleStatus, "active");
  assert.equal(payload.storageProvider, "s3");
  assert.equal(payload.status, "ready");
  assert.equal(payload.readOnly, false);
  assert.deepEqual(payload.generatedMeta.sourceDocumentIds, [
    "mock_doc_1",
    "64b64b64b64b64b64b64b64e",
  ]);
  assert.equal(payload.contentStats.estimatedTokenCount, 2);
});

test("generated document repository memory fake stores records and DTO hides object key", async () => {
  const repository = createMemoryGeneratedDocumentRepository();
  const payload = buildGeneratedDocumentPayload({
    documentId: repository.createDocumentId(),
    demoSessionId: "demo_123",
    chatId: "64b64b64b64b64b64b64b64c",
    filenameMeta: normalizeGeneratedDocumentFilename("brief.txt"),
    objectKey: "demo-sessions/demo_123/generated/generated_1/brief.txt",
    sizeBytes: 5,
    content: "Brief",
    generatedMeta: {
      generationInstruction: "Create brief",
      sourceMessageIds: [],
      sourceDocumentIds: ["mock_doc_1"],
      referencesIncluded: false,
    },
  });

  const created = await repository.createGeneratedDocumentRecord(payload);
  const count = await repository.countGeneratedDocumentsByDemoSession({
    demoSessionId: "demo_123",
  });
  const dto = toDocumentDto(created);

  assert.equal(count, 1);
  assert.equal(dto.sourceType, "generated");
  assert.equal(dto.scope, "generated");
  assert.equal(dto.downloadAvailable, true);
  assert.equal("objectKey" in dto, false);
});
