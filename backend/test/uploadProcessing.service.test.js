import { test } from "node:test";
import assert from "node:assert/strict";

const { processUploadedDocument } = await import(
  "../src/services/uploads/uploadProcessing.service.js"
);
const {
  buildUploadDocumentPayload,
  createMemoryUploadDocumentRepository,
} = await import("../src/services/uploads/uploadDocument.repository.js");

function uploadFixture({ objectKey = "demo-sessions/demo_123/uploads/upload_1/brief.md" } = {}) {
  const repository = createMemoryUploadDocumentRepository();
  const document = {
    ...buildUploadDocumentPayload({
      documentId: repository.createDocumentId(),
      demoSessionId: "demo_123",
      filenameMeta: {
        originalFilename: "brief.md",
        downloadFilename: "brief.md",
        title: "Brief",
        fileExtension: "md",
      },
      validation: {
        originalFilename: "brief.md",
        sizeBytes: 8,
        fileKind: "markdown",
        fileExtension: "md",
        mimeType: "text/markdown",
      },
      objectKey,
    }),
  };

  return { repository, document };
}

const uploadFile = {
  buffer: Buffer.from("# Brief"),
  filenameMeta: {
    downloadFilename: "brief.md",
  },
  validation: {
    mimeType: "text/markdown",
    fileKind: "markdown",
  },
};

test("upload processing calls extraction and indexing seams and marks ready", async () => {
  const { repository, document } = uploadFixture();
  await repository.createUploadDocumentRecord(document);
  let extractorInput = null;
  let indexerInput = null;

  const result = await processUploadedDocument({
    document,
    uploadFile,
    repository,
    extractor: async (input) => {
      extractorInput = input;
      return {
        title: "Brief",
        fileKind: "markdown",
        originalFilename: "brief.md",
        extractedText: "# Brief",
        optimizedText: "# Brief",
        textPreview: "# Brief",
        sourceBlocks: [],
        stats: {
          extractedCharCount: 7,
          optimizedCharCount: 7,
          estimatedTokenCount: 2,
          sourceBlockCount: 1,
          truncated: false,
          warningsCount: 0,
        },
        warnings: [],
      };
    },
    indexer: async (input) => {
      indexerInput = input;
      return {
        contentStats: {
          extractedCharCount: 7,
          optimizedCharCount: 7,
          estimatedTokenCount: 2,
          chunkCount: 1,
        },
        statusSequence: ["extracting", "optimizing", "chunking", "embedding", "ready"],
        warnings: [],
      };
    },
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(result.statusSequence, [
    "uploaded",
    "extracting",
    "optimizing",
    "chunking",
    "embedding",
    "ready",
  ]);
  assert.equal(result.document.status, "ready");
  assert.equal(result.document.contentStats.chunkCount, 1);
  assert.equal(extractorInput.originalFilename, "brief.md");
  assert.equal(indexerInput.document._id, document._id);
});

test("upload processing failure marks failed safely and keeps object-backed download possible", async () => {
  const { repository, document } = uploadFixture();
  await repository.createUploadDocumentRecord(document);

  const result = await processUploadedDocument({
    document,
    uploadFile,
    repository,
    extractor: async () => {
      const error = new Error("Failed at C:\\Users\\Me\\secret.txt api_key=SECRET");
      error.code = "EXTRACTION_FAILED";
      throw error;
    },
    indexer: async () => {
      throw new Error("should not run");
    },
  });

  assert.equal(result.status, "failed");
  assert.equal(result.document.status, "failed");
  assert.equal(result.document.objectKey, "demo-sessions/demo_123/uploads/upload_1/brief.md");
  assert.equal(result.document.statusMessage.includes("C:\\Users"), false);
  assert.equal(result.document.statusMessage.includes("SECRET"), false);
  assert.equal(result.warnings[0].code, "DOCUMENT_PROCESSING_FAILED");
});
