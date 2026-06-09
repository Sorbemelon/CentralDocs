import { test } from "node:test";
import assert from "node:assert/strict";

const { toGeneratedDocumentResponseDto } = await import(
  "../src/services/generatedDocuments/generatedDocument.dto.js"
);

test("generated document DTO exposes safe document, generation, download, and usage data", () => {
  const dto = toGeneratedDocumentResponseDto({
    document: {
      _id: "doc_1",
      title: "Generated Brief",
      originalFilename: "brief.md",
      downloadFilename: "brief.md",
      fileExtension: "md",
      mimeType: "text/markdown",
      fileKind: "markdown",
      scope: "generated",
      sourceType: "generated",
      readOnly: false,
      status: "ready",
      lifecycleStatus: "active",
      sizeBytes: 20,
      objectKey: "demo-sessions/demo_123/generated/doc_1/brief.md",
      generatedMeta: {
        generationInstruction: "Create a brief.",
        sourceDocumentIds: ["mock_doc_1"],
        referencesIncluded: true,
      },
      contentStats: { chunkCount: 1 },
    },
    generation: {
      model: "gemini-3.5-flash",
      fallbackUsed: true,
      fallbackLevel: 1,
      keySlot: 2,
      latencyMs: 25,
      referencesIncluded: true,
      indexed: true,
      warnings: [],
      prompt: "hidden prompt",
    },
    download: {
      available: true,
      filename: "brief.md",
      downloadUrl: "https://signed.example/brief.md",
      expiresInSeconds: 300,
    },
    usage: { generatedDocuments: 1 },
    remaining: { generatedDocuments: 2 },
  });

  assert.equal(dto.document.sourceType, "generated");
  assert.equal(dto.document.downloadAvailable, true);
  assert.equal(dto.generation.keySlotUsed, 2);
  assert.equal(dto.download.available, true);
  assert.equal(dto.remaining.generatedDocuments, 2);
  assert.equal("objectKey" in dto.document, false);
  assert.equal("prompt" in dto.generation, false);
  assert.equal(JSON.stringify(dto).includes("demo-sessions/demo_123"), false);
});
