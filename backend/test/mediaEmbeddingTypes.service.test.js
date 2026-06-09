import { test } from "node:test";
import assert from "node:assert/strict";

const {
  assertMockMediaDocument,
  buildMediaEmbeddingLabel,
  getMediaInputType,
  isDirectMediaFileKind,
  isSupportedDirectMediaMimeType,
} = await import("../src/services/mediaEmbedding/mediaEmbeddingTypes.service.js");

function mockDocument(overrides = {}) {
  return {
    id: "mock_document",
    scope: "mock",
    sourceType: "mock",
    readOnly: true,
    lifecycleStatus: "active",
    fileKind: "image",
    title: "Workflow Diagram",
    ...overrides,
  };
}

test("media embedding types support image, audio, and video file kinds", () => {
  assert.equal(isDirectMediaFileKind("image"), true);
  assert.equal(isDirectMediaFileKind("audio"), true);
  assert.equal(isDirectMediaFileKind("video"), true);
  assert.equal(getMediaInputType("image"), "image");
  assert.equal(getMediaInputType("audio"), "audio");
  assert.equal(getMediaInputType("video"), "video");
});

test("media embedding types reject non-media document kinds", () => {
  for (const fileKind of ["text", "markdown", "csv", "tsv", "pdf", "docx", "xlsx", "pptx"]) {
    assert.equal(isDirectMediaFileKind(fileKind), false);
    assert.throws(() => getMediaInputType(fileKind), {
      code: "MEDIA_EMBEDDING_UNSUPPORTED",
    });
  }
});

test("media embedding types accept only image, audio, and video MIME families", () => {
  assert.equal(isSupportedDirectMediaMimeType("image/png"), true);
  assert.equal(isSupportedDirectMediaMimeType("audio/mpeg"), true);
  assert.equal(isSupportedDirectMediaMimeType("video/mp4"), true);
  assert.equal(isSupportedDirectMediaMimeType("application/pdf"), false);
});

test("media embedding document guard accepts read-only mock media", () => {
  const document = mockDocument();

  assert.equal(assertMockMediaDocument(document), document);
  assert.equal(buildMediaEmbeddingLabel(document), "Direct image embedding: Workflow Diagram");
});

test("media embedding document guard rejects user/generated, trashed, and non-media docs", () => {
  assert.throws(() => assertMockMediaDocument(mockDocument({ scope: "user" })), {
    statusCode: 403,
    code: "MEDIA_EMBEDDING_MOCK_ONLY",
  });
  assert.throws(() => assertMockMediaDocument(mockDocument({ scope: "generated" })), {
    statusCode: 403,
    code: "MEDIA_EMBEDDING_MOCK_ONLY",
  });
  assert.throws(() => assertMockMediaDocument(mockDocument({ lifecycleStatus: "trashed" })), {
    statusCode: 409,
    code: "DOCUMENT_TRASHED",
  });
  assert.throws(() => assertMockMediaDocument(mockDocument({ fileKind: "pdf" })), {
    statusCode: 400,
    code: "MEDIA_EMBEDDING_UNSUPPORTED",
  });
});
